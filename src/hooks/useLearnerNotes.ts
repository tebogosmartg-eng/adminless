import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { LearnerNote } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useLearnerNotes = (learnerId: string | undefined) => {
  const notes = useLiveQuery(
    () => learnerId 
      ? db.learner_notes.where('learner_id').equals(learnerId).reverse().sortBy('date') 
      : [],
    [learnerId]
  );

  const addNote = async (content: string, category: LearnerNote['category'], date: string) => {
    if (!learnerId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote: LearnerNote = {
        id: crypto.randomUUID(),
        learner_id: learnerId,
        user_id: user.id,
        content,
        category,
        date,
        created_at: new Date().toISOString()
      };

      await db.learner_notes.add(newNote);
      await queueAction('learner_notes', 'create', newNote);
      showSuccess("Note added.");
    } catch (e) {
      console.error(e);
      showError("Failed to add note.");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await db.learner_notes.delete(id);
      await queueAction('learner_notes', 'delete', { id });
      showSuccess("Note deleted.");
    } catch (e) {
      showError("Failed to delete note.");
    }
  };

  return { notes, addNote, deleteNote };
};