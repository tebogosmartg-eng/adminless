import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationError {
  type: 'weight' | 'marks';
  className: string;
  subject: string;
  details: string;
}

export const useTermValidation = () => {
  const [validating, setValidating] = useState(false);

  const validateTerm = async (termId: string): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
    setValidating(true);
    const errors: ValidationError[] = [];

    try {
      // 1. Get all assessments for this term
      const { data: assessments, error: assError } = await supabase
        .from('assessments')
        .select(`
          id, 
          title, 
          weight, 
          class_id,
          classes ( id, class_name, subject, learners (id) )
        `)
        .eq('term_id', termId);

      if (assError) throw assError;

      if (!assessments || assessments.length === 0) {
        // Technically valid to close an empty term, but let's warn? 
        // No, let's allow it, but usually a term has work.
        setValidating(false);
        return { isValid: true, errors: [] };
      }

      // Group assessments by Class
      const classGroups: { [classId: string]: typeof assessments } = {};
      assessments.forEach(ass => {
        if (!classGroups[ass.class_id]) classGroups[ass.class_id] = [];
        classGroups[ass.class_id].push(ass);
      });

      // 2. Validate Weights per Class
      for (const classId in classGroups) {
        const classAss = classGroups[classId];
        const classInfo = classAss[0].classes; // flattened from join
        
        // @ts-ignore
        const className = classInfo?.class_name || "Unknown Class";
        // @ts-ignore
        const subject = classInfo?.subject || "Unknown Subject";

        const totalWeight = classAss.reduce((sum, a) => sum + Number(a.weight), 0);

        if (totalWeight !== 100) {
          errors.push({
            type: 'weight',
            className,
            subject,
            details: `Total weighting is ${totalWeight}% (must be 100%).`
          });
        }

        // 3. Validate Missing Marks
        // We need to check if every learner in the class has a mark for every assessment
        // @ts-ignore
        const learners = classInfo?.learners || [];
        if (learners.length === 0) continue; // Skip empty classes

        const assessmentIds = classAss.map(a => a.id);
        
        // Fetch actual marks
        const { data: marks } = await supabase
          .from('assessment_marks')
          .select('assessment_id, learner_id')
          .in('assessment_id', assessmentIds);

        const marksMap = new Set(marks?.map(m => `${m.assessment_id}-${m.learner_id}`));

        let missingCount = 0;
        
        classAss.forEach(ass => {
          learners.forEach((l: any) => {
            if (!marksMap.has(`${ass.id}-${l.id}`)) {
              missingCount++;
            }
          });
        });

        if (missingCount > 0) {
          errors.push({
            type: 'marks',
            className,
            subject,
            details: `${missingCount} marks are missing across ${classAss.length} assessments.`
          });
        }
      }

    } catch (error) {
      console.error("Validation error:", error);
      errors.push({ type: 'weight', className: 'System', subject: 'Error', details: 'Failed to run validation check.' });
    } finally {
      setValidating(false);
    }

    return { isValid: errors.length === 0, errors };
  };

  return { validateTerm, validating };
};