"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { RemediationTask } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useRemediation = (classId?: string, termId?: string) => {
  const tasks = useLiveQuery(async () => {
    if (!classId || !termId) return [];
    return db.remediation_tasks
        .where('class_id').equals(classId)
        .filter(t => t.term_id === termId)
        .reverse()
        .sortBy('created_at');
  }, [classId, termId]) || [];

  const activateInterventions = async (assessmentId: string, interventions: { title: string, description: string }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !classId || !termId) return;

      try {
          const newTasks: RemediationTask[] = interventions.map(i => ({
              id: crypto.randomUUID(),
              user_id: user.id,
              class_id: classId,
              term_id: termId,
              assessment_id: assessmentId,
              title: i.title,
              description: i.description,
              status: 'pending',
              created_at: new Date().toISOString()
          }));

          await db.remediation_tasks.bulkAdd(newTasks);
          await queueAction('remediation_tasks', 'create', newTasks);
          showSuccess(`Activated ${newTasks.length} interventions in the action plan.`);
      } catch (e) {
          showError("Failed to activate interventions.");
      }
  };

  const updateTaskStatus = async (id: string, status: RemediationTask['status']) => {
      await db.remediation_tasks.update(id, { status });
      await queueAction('remediation_tasks', 'update', { id, status });
  };

  const deleteTask = async (id: string) => {
      await db.remediation_tasks.delete(id);
      await queueAction('remediation_tasks', 'delete', { id });
  };

  return { tasks, activateInterventions, updateTaskStatus, deleteTask };
};