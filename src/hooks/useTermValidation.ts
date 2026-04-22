import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ValidationError {
  type: 'weight' | 'marks' | 'evidence' | 'sample';
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: assessments } = await supabase.from('assessments').select('*').eq('term_id', termId);
      if (!assessments || assessments.length === 0) {
        setValidating(false);
        return { isValid: true, errors: [] };
      }

      const classGroups: { [classId: string]: any[] } = {};
      assessments.forEach(ass => {
        if (!classGroups[ass.class_id]) classGroups[ass.class_id] = [];
        classGroups[ass.class_id].push(ass);
      });

      const { data: termEvidence } = await supabase.from('evidence').select('*').eq('term_id', termId);
      const { data: classesData } = await supabase.from('classes').select('*').eq('user_id', user?.id);

      for (const classId in classGroups) {
        const classAss = classGroups[classId];
        const classInfo = (classesData || []).find(c => c.id === classId);
        
        const className = classInfo?.class_name || classInfo?.className || "Unknown Class";
        const subject = classInfo?.subject || "Unknown Subject";

        const totalWeight = classAss.reduce((sum, a) => sum + Number(a.weight), 0);
        if (totalWeight !== 100) {
          errors.push({ type: 'weight', className, subject, details: `Total weighting is ${totalWeight}% (must be 100%).` });
        }

        const { data: learners } = await supabase.from('learners').select('id').eq('class_id', classId);
        
        if (learners && learners.length > 0) {
            const assessmentIds = classAss.map(a => a.id);
            const { data: marks } = await supabase.from('assessment_marks').select('assessment_id, learner_id, score').in('assessment_id', assessmentIds);

            let missingCount = 0;
            classAss.forEach(ass => {
              learners.forEach((l) => {
                const markEntry = (marks || []).find(m => m.assessment_id === ass.id && m.learner_id === l.id);
                if (!markEntry || markEntry.score === null || markEntry.score === undefined) {
                  missingCount++;
                }
              });
            });

            if (missingCount > 0) {
              errors.push({ type: 'marks', className, subject, details: `${missingCount} marks are missing across ${classAss.length} assessments.` });
            }

            const classEvidence = (termEvidence || []).filter(e => e.class_id === classId);
            const scriptEvidence = classEvidence.filter(e => e.category === 'script');
            const requiredCount = Math.max(1, Math.ceil(learners.length * 0.1));
            
            if (scriptEvidence.length < requiredCount) {
                errors.push({ type: 'sample', className, subject, details: `Moderation failure: Uploaded ${scriptEvidence.length} scripts, but ${requiredCount} are required for audit (10% of class).` });
            }
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
      errors.push({ type: 'weight', className: 'System', subject: 'Error', details: 'Failed to run validation check locally.' });
    } finally {
      setValidating(false);
    }

    return { isValid: errors.length === 0, errors };
  };

  return { validateTerm, validating };
};