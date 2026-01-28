import { useState, useEffect } from 'react';
import { db } from '@/db';
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
        const marks = await db.assessment_marks
            .where('learner_id')
            .equals(learnerId)
            .toArray();

        if (!marks || marks.length === 0) {
            setResults([]);
            setLoading(false);
            return;
        }

        const assessmentIds = marks.map(m => m.assessment_id);

        // 2. Get Assessments details
        const assessments = await db.assessments
            .where('id')
            .anyOf(assessmentIds)
            .toArray();

        // 3. Get Term details
        const termIds = [...new Set(assessments.map(a => a.term_id))];
        const terms = await db.terms
            .where('id')
            .anyOf(termIds)
            .toArray();
        const termMap = new Map(terms.map(t => [t.id, t.name]));

        // NEW: Calculate Class Averages
        // Fetch all marks for these assessments (not just for this learner)
        const allMarksForAssessments = await db.assessment_marks
            .where('assessment_id')
            .anyOf(assessmentIds)
            .toArray();

        const assessmentAverages = new Map<string, number>();
        
        assessments.forEach(ass => {
            const marksForAss = allMarksForAssessments.filter(m => m.assessment_id === ass.id && m.score !== null);
            if (marksForAss.length > 0) {
                const totalScore = marksForAss.reduce((sum, m) => sum + Number(m.score), 0);
                const avgScore = totalScore / marksForAss.length;
                const avgPercent = (avgScore / ass.max_mark) * 100;
                assessmentAverages.set(ass.id, avgPercent);
            }
        });

        // 4. Format data
        const formatted: AssessmentResult[] = marks.map((m) => {
          const ass = assessments.find(a => a.id === m.assessment_id);
          
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

        // Sort by date
        formatted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setResults(formatted);
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