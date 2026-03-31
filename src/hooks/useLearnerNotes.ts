import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { LearnerNote } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useAcademic } from '@/context/AcademicContext';

export const useLearnerNotes = (learnerId: string | undefined) => {
  const { activeYear, activeTerm } = useAcademic();
  
  // Scoped Query
  const notes = useLiveQuery(
    async () => {
      if (!learnerId || !activeTerm?.id) return [];
      return await db.learner_notes
        .where('learner_id')
        .equals(learnerId)
        .filter(n => n.term_id === activeTerm.id)
        .reverse()
        .sortBy('date');
    },
    [learnerId, activeTerm?.id]
  ) || [];

  const addNote = async (content: string, category: LearnerNote['category'], date: string) => {
    // VALIDATION: Throw if context missing
    if (!learnerId || !activeYear?.id || !activeTerm?.id) {
        showError("Note creation blocked: Academic context not loaded.");
        return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote: LearnerNote = {
        id: crypto.randomUUID(),
        learner_id: learnerId,
        user_id: user.id,
        year_id: activeYear.id, // Automatic Scoping
        term_id: activeTerm.id, // Automatic Scoping
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