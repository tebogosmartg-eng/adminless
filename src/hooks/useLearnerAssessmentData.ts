import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Assessment, AssessmentMark, Term } from '@/lib/types';

export interface AssessmentResult {
  termName: string;
  termId: string;
  assessmentTitle: string;
  assessmentType: string;
  date: string;
  score: number | null;
  max: number;
  weight: number;
  percentage: number | null;
  classAverage: number | null;
}

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
          .select(`
            score,
            assessments (
              id,
              title,
              type,
              max_mark,
              weight,
              date,
              term_id,
              terms ( id, name )
            )
          `)
          .eq('learner_id', learnerId);

        if (marksError) throw marksError;

        // 2. Format data
        const formatted: AssessmentResult[] = marks.map((m: any) => {
          const ass = m.assessments;
          const score = m.score ? Number(m.score) : null;
          const percentage = score !== null ? (score / ass.max_mark) * 100 : null;

          return {
            termName: ass.terms?.name || 'Unknown Term',
            termId: ass.term_id,
            assessmentTitle: ass.title,
            assessmentType: ass.type,
            date: ass.date || new Date().toISOString(),
            score,
            max: ass.max_mark,
            weight: ass.weight,
            percentage: percentage ? parseFloat(percentage.toFixed(1)) : null,
            classAverage: null // We could fetch this separately if needed
          };
        });

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