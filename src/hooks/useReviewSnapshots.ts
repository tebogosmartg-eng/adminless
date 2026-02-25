"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { ReviewSnapshot } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useReviewSnapshots = (classId: string, termId: string) => {
  const snapshots = useLiveQuery(
    () => db.review_snapshots.where('[class_id+term_id]').equals([classId, termId]).reverse().sortBy('created_at'),
    [classId, termId]
  ) || [];

  const createSnapshot = async (name: string, entryIds: string[], rules: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const newSnapshot: ReviewSnapshot = {
        id: crypto.randomUUID(),
        user_id: user.id,
        class_id: classId,
        term_id: termId,
        name,
        rules,
        entry_ids: entryIds,
        created_at: new Date().toISOString()
      };

      await db.review_snapshots.add(newSnapshot);
      await queueAction('review_snapshots', 'create', newSnapshot);
      showSuccess(`Snapshot "${name}" saved.`);
    } catch (e) {
      showError("Failed to save snapshot.");
    }
  };

  const deleteSnapshot = async (id: string) => {
      await db.review_snapshots.delete(id);
      await queueAction('review_snapshots', 'delete', { id });
  };

  return { snapshots, createSnapshot, deleteSnapshot };
};