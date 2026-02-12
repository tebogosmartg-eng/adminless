"use client";

import { useCallback } from 'react';
import { db } from '@/db';
import { queueAction } from '@/services/sync';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { showSuccess } from '@/utils/toast';

export const useAcademicAverages = () => {
  const updateLearnerActiveAverages = useCallback(async (learnerIds: string[]) => {
    if (learnerIds.length === 0) return;

    for (const learnerId of learnerIds) {
        const learner = await db.learners.get(learnerId);
        if (!learner) continue;

        const classInfo = await db.classes.get(learner.class_id);
        if (!classInfo) continue;

        const termAssessments = await db.assessments
            .where('[class_id+term_id]')
            .equals([learner.class_id, classInfo.term_id])
            .toArray();
        
        if (termAssessments.length === 0) {
            await db.learners.update(learnerId, { mark: "" });
            continue;
        }

        const assessmentIds = termAssessments.map(a => a.id);
        const learnerMarks = await db.assessment_marks
            .where('assessment_id')
            .anyOf(assessmentIds)
            .and(m => m.learner_id === learnerId)
            .toArray();

        const avg = calculateWeightedAverage(termAssessments, learnerMarks, learnerId);
        const newAverage = formatDisplayMark(avg);

        await db.learners.update(learnerId, { mark: newAverage });
        await queueAction('learners', 'update', { id: learnerId, mark: newAverage });
    }
  }, []);

  const recalculateAllActiveAverages = useCallback(async () => {
      const allMarks = await db.assessment_marks.toArray();
      const markGroups: Record<string, string[]> = {};
      
      allMarks.forEach(m => {
          const key = `${m.assessment_id}-${m.learner_id}`;
          if (!markGroups[key]) markGroups[key] = [];
          markGroups[key].push(m.id);
      });

      const toDeleteLocally: string[] = [];
      Object.values(markGroups).forEach(ids => {
          if (ids.length > 1) {
              toDeleteLocally.push(...ids.slice(0, ids.length - 1));
          }
      });

      if (toDeleteLocally.length > 0) {
          await db.assessment_marks.bulkDelete(toDeleteLocally);
      }

      const allLearners = await db.learners.toArray();
      const ids = allLearners.map(l => l.id!);
      
      await db.transaction('rw', [db.learners, db.classes, db.assessments, db.assessment_marks, db.sync_queue], async () => {
          await updateLearnerActiveAverages(ids);
      });

      showSuccess("Global data audit and average repair complete.");
  }, [updateLearnerActiveAverages]);

  return {
    updateLearnerActiveAverages,
    recalculateAllActiveAverages
  };
};