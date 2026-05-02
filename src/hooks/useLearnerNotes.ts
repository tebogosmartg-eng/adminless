import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LearnerNote } from "@/lib/types";
import { showSuccess, showError } from "@/utils/toast";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";

export const useLearnerNotes = (learnerId: string | undefined, isLockedOverride: boolean = false) => {
  const { activeYear, activeTerm } = useAcademic();
  const { classes } = useClasses();

  const [notes, setNotes] = useState<LearnerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const learnerClass = classes.find((item) => item.learners.some((learner) => learner.id === learnerId));
  const isLocked = isLockedOverride || !!activeTerm?.closed || !!learnerClass?.is_finalised;

  // 🔥 FETCH NOTES
  useEffect(() => {
    let isMounted = true;

    const fetchNotes = async () => {
      if (!learnerId || !activeTerm?.id) {
        if (isMounted) {
          setNotes([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("learner_notes")
        .select("*")
        .eq("learner_id", learnerId)
        .eq("term_id", activeTerm.id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Fetch notes error:", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setNotes((data as LearnerNote[]) || []);
        setLoading(false);
      }
    };

    fetchNotes();

    return () => {
      isMounted = false;
    };
  }, [learnerId, activeTerm?.id]);

  // 🔥 ADD NOTE
  const addNote = async (
    content: string,
    category: LearnerNote["category"],
    date: string
  ) => {
    if (isLocked) {
      showError("Learner notes are locked for this finalized term.");
      return;
    }
    if (!learnerId || !activeYear?.id || !activeTerm?.id) {
      showError("Note creation blocked: Academic context not loaded.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("User not authenticated.");
        return;
      }

      const newNote = {
        learner_id: learnerId,
        user_id: user.id,
        year_id: activeYear.id,
        term_id: activeTerm.id,
        content,
        category,
        date,
      };

      const { data, error } = await supabase
        .from("learner_notes")
        .insert([newNote])
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data as LearnerNote, ...prev]);

      showSuccess("Note added.");
    } catch (e) {
      console.error(e);
      showError("Failed to add note.");
    }
  };

  // 🔥 DELETE NOTE
  const deleteNote = async (id: string) => {
    if (isLocked) {
      showError("Learner notes are locked for this finalized term.");
      return;
    }
    try {
      const { error } = await supabase
        .from("learner_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== id));

      showSuccess("Note deleted.");
    } catch (e) {
      console.error(e);
      showError("Failed to delete note.");
    }
  };

  return { notes, loading, addNote, deleteNote };
};