import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { LearnerNote } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useState, useEffect } from 'react';

export interface AlertWithLearner extends LearnerNote {
  learnerName: string;
  className: string;
  classId?: string;
}

export const useNotesLogic = () => {
  const [recentAlerts, setRecentAlerts] = useState<AlertWithLearner[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Live query for all notes to trigger updates, but we process manually for joins
  const trigger = useLiveQuery(() => db.learner_notes.orderBy('created_at').reverse().limit(1).toArray());

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        // Fetch recent notes of specific categories
        const notes = await db.learner_notes
          .where('category')
          .anyOf('behavior', 'academic', 'parent')
          .reverse()
          .sortBy('date');
        
        const topNotes = notes.slice(0, 10); // Get top 10

        if (topNotes.length === 0) {
            setRecentAlerts([]);
            setLoadingAlerts(false);
            return;
        }

        // Get unique learner IDs
        const learnerIds = [...new Set(topNotes.map(n => n.learner_id))];
        const learners = await db.learners.where('id').anyOf(learnerIds).toArray();
        const learnerMap = new Map(learners.map(l => [l.id, l]));

        // Get class IDs for context
        const classIds = [...new Set(learners.map(l => l.class_id))];
        const classes = await db.classes.where('id').anyOf(classIds).toArray();
        const classMap = new Map(classes.map(c => [c.id, c.className]));

        const alerts = topNotes.map(note => {
            const learner = learnerMap.get(note.learner_id);
            const className = learner ? classMap.get(learner.class_id) || 'Unknown Class' : 'Unknown';
            
            return {
                ...note,
                learnerName: learner?.name || 'Unknown Learner',
                className,
                classId: learner?.class_id
            };
        });

        setRecentAlerts(alerts);
      } catch (error) {
        console.error("Failed to fetch alerts", error);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, [trigger]); // Re-run when DB changes

  const addNoteGlobal = async (learnerId: string, content: string, category: LearnerNote['category'], date: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

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
      showSuccess("Note added successfully.");
      return true;
    } catch (e) {
      console.error(e);
      showError("Failed to add note.");
      return false;
    }
  };

  return { recentAlerts, loadingAlerts, addNoteGlobal };
};