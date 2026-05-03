import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { applySupabaseAssessmentOrder, sortAssessmentsDeterministically } from '@/utils/assessmentOrdering';
import type { Assessment, AssessmentMark, Learner, ValidationError } from '@/lib/types';
import {
  validateClassTermForFinalization,
  termFinalizationIssuesToValidationErrors,
} from '@/utils/termFinalizationValidation';

export type { ValidationError } from '@/lib/types';

export const useTermValidation = () => {
  const [validating, setValidating] = useState(false);

  const validateTerm = async (termId: string): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
    setValidating(true);
    const errors: ValidationError[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: assessments } = await applySupabaseAssessmentOrder(
        supabase.from('assessments').select('*').eq('term_id', termId)
      );
      if (!assessments || assessments.length === 0) {
        setValidating(false);
        return { isValid: true, errors: [] };
      }
      const orderedAssessments = sortAssessmentsDeterministically(assessments);

      const classGroups: { [classId: string]: any[] } = {};
      orderedAssessments.forEach(ass => {
        if (!classGroups[ass.class_id]) classGroups[ass.class_id] = [];
        classGroups[ass.class_id].push(ass);
      });

      const { data: moderationSamples } = await supabase.from('moderation_samples').select('*').eq('term_id', termId);
      const { data: classesData } = await supabase.from('classes').select('*').eq('user_id', user?.id);

      for (const classId in classGroups) {
        const classAss = classGroups[classId] as Assessment[];
        const classInfo = (classesData || []).find((c) => c.id === classId);

        const className = classInfo?.class_name || classInfo?.className || "Unknown Class";
        const subject = classInfo?.subject || "Unknown Subject";

        const { data: learners } = await supabase.from("learners").select("id, name").eq("class_id", classId);
        const assessmentIds = classAss.map((a) => a.id);
        const { data: marks } = await supabase
          .from("assessment_marks")
          .select("assessment_id, learner_id, score")
          .in("assessment_id", assessmentIds);

        const sample = (moderationSamples || []).find((s: { class_id: string }) => s.class_id === classId);
        const readiness = validateClassTermForFinalization({
          className,
          subject,
          assessments: classAss,
          learners: (learners || []) as Learner[],
          marks: (marks || []) as AssessmentMark[],
          moderationSample: sample,
        });
        errors.push(...termFinalizationIssuesToValidationErrors(className, subject, readiness.issues));
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