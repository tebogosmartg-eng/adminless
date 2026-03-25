import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AssessmentResult } from '@/lib/types';

export { type AssessmentResult };

export const useLearnerAssessmentData = (learnerId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AssessmentResult[]>([]);

  useEffect(() => {
    if (!learnerId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get all marks for this learner
        const { data: marks, error: marksError } = await supabase
            .from('assessment_marks')
            .select('*')
            .eq('learner_id', learnerId);

        if (marksError) throw marksError;
        if (!marks || marks.length === 0) {
            setResults([]);
            setLoading(false);
            return;
        }

        const assessmentIds = marks.map(m => m.assessment_id);

        // 2. Get Assessments details
        const { data: assessments, error: assError } = await supabase
            .from('assessments')
            .select('*')
            .in('id', assessmentIds);
        
        if (assError) throw assError;

        // 3. Get Term details
        const termIds = [...new Set(assessments?.map(a => a.term_id) || [])];
        const { data: terms, error: termsError } = await supabase
            .from('terms')
            .select('*')
            .in('id', termIds);
        
        if (termsError) throw termsError;
        const termMap = new Map(terms?.map(t => [t.id, t.name]) || []);

        // NEW: Calculate Class Averages
        // Fetch all marks for these assessments (not just for this learner)
        const { data: allMarksForAssessments, error: allMarksError } = await supabase
            .from('assessment_marks')
            .select('*')
            .in('assessment_id', assessmentIds);
        
        if (allMarksError) throw allMarksError;

        const assessmentAverages = new Map<string, number>();
        
        assessments?.forEach(ass => {
            const marksForAss = allMarksForAssessments?.filter(m => m.assessment_id === ass.id && m.score !== null) || [];
            if (marksForAss.length > 0) {
                const totalScore = marksForAss.reduce((sum, m) => sum + Number(m.score), 0);
                const avgScore = totalScore / marksForAss.length;
                const avgPercent = (avgScore / ass.max_mark) * 100;
                assessmentAverages.set(ass.id, avgPercent);
            }
        });

        // 4. Format data
        const formatted: AssessmentResult[] = marks.map((m) => {
          const ass = assessments?.find(a => a.id === m.assessment_id);
          
          if (!ass) return null;

          const score = m.score ? Number(m.score) : null;
          const percentage = score !== null ? (score / ass.max_mark) * 100 : null;

          return {
            termName: termMap.get(ass.term_id) || 'Unknown Term',
            termId: ass.term_id,
            assessmentTitle: ass.title,
            assessmentType: ass.type,
            date: ass.date || new Date().toISOString(),
            score,
            max: ass.max_mark,
            weight: ass.weight,
            percentage: percentage ? parseFloat(percentage.toFixed(1)) : null,
            classAverage: assessmentAverages.get(ass.id) !== undefined
                ? parseFloat(assessmentAverages.get(ass.id)!.toFixed(1))
                : null
          };
        }).filter(item => item !== null) as AssessmentResult[];

        // Sort chronologically by date
        formatted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 5. Calculate Previous Performance Level (Running Average)
        let runningSum = 0;
        let runningCount = 0;

        const finalResults = formatted.map(item => {
            let previousAverage: number | null = null;
            let trend: 'Improving' | 'Declining' | 'Stable' | null = null;

            if (runningCount > 0) {
                previousAverage = runningSum / runningCount;
                
                if (item.percentage !== null) {
                    if (item.percentage >= previousAverage + 5) {
                        trend = 'Improving';
                    } else if (item.percentage <= previousAverage - 5) {
                        trend = 'Declining';
                    } else {
                        trend = 'Stable';
                    }
                }
            }

            // Add current item to the running total for the next loop iteration
            if (item.percentage !== null) {
                runningSum += item.percentage;
                runningCount++;
            }

            return {
                ...item,
                previousAverage: previousAverage !== null ? parseFloat(previousAverage.toFixed(1)) : null,
                trend
            };
        });

        setResults(finalResults);
      } catch (err) {
        console.error("Error fetching learner assessments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [learnerId]);

  return { loading, results };
};