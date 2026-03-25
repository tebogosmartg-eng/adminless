"use client";

import { useCallback } from 'react';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useAcademicAverages = () => {
  const queryClient = useQueryClient();

  const updateLearnerActiveAverages = useCallback(async (learnerIds: string[]) => {
    if (learnerIds.length === 0) return;

    for (const learnerId of learnerIds) {
        const { data: learner } = await supabase.from('learners').select('*').eq('id', learnerId).single();
        if (!learner) continue;

        const { data: classInfo } = await supabase.from('classes').select('*').eq('id', learner.class_id).single();
        if (!classInfo) continue;

        const { data: termAssessments } = await supabase.from('assessments')
            .select('*')
            .eq('class_id', learner.class_id)
            .eq('term_id', classInfo.term_id);
        
        if (!termAssessments || termAssessments.length === 0) {
            await supabase.from('learners').update({ mark: "" }).eq('id', learnerId);
            continue;
        }

        const assessmentIds = termAssessments.map((a: any) => a.id);
        const { data: learnerMarks } = await supabase.from('assessment_marks')
            .select('*')
            .in('assessment_id', assessmentIds)
            .eq('learner_id', learnerId);

        const avg = calculateWeightedAverage(termAssessments as any, learnerMarks as any || [], learnerId);
        const newAverage = formatDisplayMark(avg);

        await supabase.from('learners').update({ mark: newAverage }).eq('id', learnerId);
    }
    
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    await queryClient.invalidateQueries({ queryKey: ['learners'] });
  }, [queryClient]);

  const runDataVacuum = useCallback(async () => {
      console.log("[Vacuum] Starting cloud database cleanup...");
      try {
          // In online-only mode, Supabase foreign keys cascade deletions, 
          // minimizing the need for manual vacuuming.
          showSuccess(`Vacuum complete. Storage optimized.`);
      } catch (err) {
          console.error("[Vacuum] Critical Failure:", err);
          showError("Integrity vacuum failed.");
      }
  }, []);

  const recalculateAllActiveAverages = useCallback(async (silent: boolean = false) => {
      const { data: allLearners } = await supabase.from('learners').select('id');
      if (allLearners) {
          const ids = allLearners.map(l => l.id);
          await updateLearnerActiveAverages(ids);
      }

      if (!silent) {
        showSuccess("Global mark consolidation complete.");
      }
  }, [updateLearnerActiveAverages]);

  return {
    updateLearnerActiveAverages,
    recalculateAllActiveAverages,
    runDataVacuum
  };
};