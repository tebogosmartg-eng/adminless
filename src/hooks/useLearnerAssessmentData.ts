import { useState, useEffect } from 'react';
import { db } from '@/db';
import { AssessmentResult } from '@/lib/types';

// We need to extend the type because our local join manual construction might look slightly different
// but the interface for the component remains the same.

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

        // 4. Format data
        const formatted: AssessmentResult[] = marks.map((m) => {
          const ass = assessments.find(a => a.id === m.assessment_id);
          
          if (!ass) return null; // Should not happen if data integrity is good

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
            classAverage: null 
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