import { useState, useEffect, useCallback, useRef } from 'react';
import { Learner, ClassInfo } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabaseClient';
import { logAmendmentEvent } from '@/utils/amendmentLog';

type UpdateLearnersOptions = { isAmendmentMode?: boolean };

export type AmendmentLearnerAudit = {
  isAmendmentMode: boolean;
  classId: string;
  userId?: string;
};

export const useLearnerState = (
  classInfo: ClassInfo | undefined,
  updateLearnersContext: (
    classId: string,
    learners: Learner[],
    options?: UpdateLearnersOptions,
  ) => Promise<void>,
  isLocked: boolean = false,
  amendmentAudit?: AmendmentLearnerAudit | null,
) => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [prevGradedCount, setPrevGradedCount] = useState(0);
  
  const lastSyncedLearnersRef = useRef<Learner[] | null>(null);

  useEffect(() => {
    if (classInfo) {
      if (classInfo.learners !== lastSyncedLearnersRef.current) {
        setLearners(classInfo.learners);
        lastSyncedLearnersRef.current = classInfo.learners;
        
        const count = classInfo.learners.filter(l => l.mark && l.mark.trim() !== '').length;
        setPrevGradedCount(count);
      }
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo) {
      const original = JSON.stringify(classInfo.learners);
      const current = JSON.stringify(learners);
      setHasUnsavedChanges(original !== current);
      
      const currentGradedCount = learners.filter(l => l.mark && l.mark.trim() !== '').length;
      if (learners.length > 0 && currentGradedCount === learners.length && currentGradedCount > prevGradedCount) {
        triggerConfetti();
      }
      setPrevGradedCount(currentGradedCount);
    }
  }, [learners, classInfo, prevGradedCount]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const ensureUnlocked = useCallback(() => {
    if (!isLocked) return true;
    showError("This class is locked for the finalized term.");
    return false;
  }, [isLocked]);

  const logIfAmendment = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      if (!amendmentAudit?.isAmendmentMode) return;
      logAmendmentEvent({
        type,
        classId: amendmentAudit.classId,
        userId: amendmentAudit.userId,
        payload,
      });
    },
    [amendmentAudit],
  );

  const handleMarkChange = useCallback((index: number, mark: string) => {
    if (!ensureUnlocked()) return;
    setLearners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mark };
      return updated;
    });
  }, [ensureUnlocked]);

  const handleCommentChange = useCallback((index: number, comment: string) => {
    if (!ensureUnlocked()) return;
    setLearners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], comment };
      return updated;
    });
  }, [ensureUnlocked]);
  
  const handleRenameLearner = useCallback(async (index: number, newName: string) => {
    if (!ensureUnlocked()) return;
    const learner = learners[index];
    if (!learner || !learner.id) return;
    try {
      const { error } = await supabase.from('learners').update({ name: newName }).eq('id', learner.id);
      if (error) throw error;
      setLearners(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], name: newName };
        return updated;
      });
      logIfAmendment('LEARNER_RENAMED', { learnerId: learner.id, newName });
    } catch (err: any) {
      showError("Failed to rename learner: " + err.message);
      throw err;
    }
  }, [learners, ensureUnlocked, logIfAmendment]);

  const handleRemoveLearner = useCallback(async (index: number) => {
    if (!ensureUnlocked()) return;
    const learner = learners[index];
    if (!learner || !learner.id) return;
    if (confirm("Are you sure you want to remove this learner?")) {
      try {
        const { error } = await supabase.from('learners').delete().eq('id', learner.id);
        if (error) throw error;
        setLearners(prev => prev.filter((_, i) => i !== index));
        showSuccess("Learner removed.");
        logIfAmendment('LEARNER_REMOVED', { learnerId: learner.id });
      } catch (err: any) {
        showError("Failed to remove learner: " + err.message);
        throw err;
      }
    }
  }, [learners, ensureUnlocked, logIfAmendment]);

  const handleBatchDelete = useCallback(async (indices: number[]) => {
    if (!ensureUnlocked()) return;
    const toDeleteIds = indices.map(i => learners[i]?.id).filter(Boolean) as string[];
    if (toDeleteIds.length === 0) return;
    try {
      const { error } = await supabase.from('learners').delete().in('id', toDeleteIds);
      if (error) throw error;
      setLearners(prev => prev.filter((_, i) => !indices.includes(i)));
      showSuccess(`Deleted ${toDeleteIds.length} learners.`);
      logIfAmendment('LEARNERS_BATCH_DELETED', { learnerIds: toDeleteIds });
    } catch (e: any) {
      showError("Failed to delete learners: " + e.message);
      throw e;
    }
  }, [learners, ensureUnlocked, logIfAmendment]);

  const handleBatchComment = useCallback((indices: number[], comment: string) => {
    if (!ensureUnlocked()) return;
    setLearners(prev => {
      const updated = [...prev];
      indices.forEach(index => {
        if (updated[index]) {
          updated[index] = { ...updated[index], comment };
        }
      });
      return updated;
    });
    showSuccess(`Updated comments for ${indices.length} learners.`);
  }, [ensureUnlocked]);

  const handleBatchClearMarks = useCallback((indices: number[]) => {
    if (!ensureUnlocked()) return;
    setLearners(prev => {
      const updated = [...prev];
      indices.forEach(index => {
        if (updated[index]) {
          updated[index] = { ...updated[index], mark: "" };
        }
      });
      return updated;
    });
    showSuccess(`Cleared marks for ${indices.length} learners.`);
  }, [ensureUnlocked]);

  const handleAddLearners = useCallback(async (input: string[] | Learner[]) => {
    if (!ensureUnlocked()) return;
    if (!classInfo?.id) return;
    
    let newLearners: Learner[] = [];
    if (input.length > 0 && typeof input[0] === 'string') {
        newLearners = (input as string[]).map(name => ({ name, mark: "", class_id: classInfo.id }));
    } else {
        newLearners = (input as Learner[]).map(l => ({ ...l, class_id: classInfo.id }));
    }
    
    const learnersWithIds = newLearners.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      gender: l.gender || null,
      mark: l.mark || null,
      comment: l.comment || null
    }));

    try {
      const { error } = await supabase.from('learners').insert(learnersWithIds);
      if (error) throw error;
      
      setLearners(prev => [...prev, ...learnersWithIds]);
      showSuccess(`Added ${newLearners.length} learner(s) successfully.`);
      logIfAmendment('LEARNERS_ADDED', { count: newLearners.length });
    } catch (e: any) {
      console.error("Error adding learners:", e);
      showError("Failed to add learners: " + e.message);
      throw e;
    }
  }, [classInfo?.id, ensureUnlocked, logIfAmendment]);

  const handleClearMarks = useCallback(() => {
    if (!ensureUnlocked()) return;
    if (confirm("Clear ALL marks and comments? This cannot be undone once saved.")) {
      setLearners(prev => prev.map(l => ({ ...l, mark: "", comment: "" })));
      showSuccess("All marks cleared. Click 'Save Changes' to confirm.");
    }
  }, [ensureUnlocked]);

  const handleUpdateLearners = useCallback(async (updatedLearners: Learner[]) => {
    if (!ensureUnlocked()) return;
    if (!classInfo?.id) return;
    try {
      await updateLearnersContext(classInfo.id, updatedLearners, {
        isAmendmentMode: !!amendmentAudit?.isAmendmentMode,
      });
      setLearners(updatedLearners);
      showSuccess("Class roster updated successfully.");
      logIfAmendment('LEARNER_ROSTER_UPDATED', { learnerCount: updatedLearners.length });
    } catch (err: any) {
      showError("Failed to save changes: " + err.message);
      throw err;
    }
  }, [classInfo?.id, updateLearnersContext, amendmentAudit?.isAmendmentMode, ensureUnlocked, logIfAmendment]);

  const handleSaveChanges = useCallback(async () => {
    if (!ensureUnlocked()) return;
    if (classInfo?.id) {
      try {
        await updateLearnersContext(classInfo.id, learners, {
          isAmendmentMode: !!amendmentAudit?.isAmendmentMode,
        });
        showSuccess("Changes have been saved successfully!");
        setHasUnsavedChanges(false);
        logIfAmendment('LEARNER_ROSTER_SAVED', { learnerCount: learners.length });
      } catch (err: any) {
        showError("Failed to save changes: " + err.message);
        throw err;
      }
    }
  }, [
    classInfo?.id,
    learners,
    updateLearnersContext,
    amendmentAudit?.isAmendmentMode,
    ensureUnlocked,
    logIfAmendment,
  ]);

  return {
    learners,
    setLearners,
    hasUnsavedChanges,
    handleMarkChange,
    handleCommentChange,
    handleRenameLearner,
    handleRemoveLearner,
    handleBatchDelete,
    handleBatchComment,
    handleBatchClearMarks,
    handleAddLearners,
    handleClearMarks,
    handleUpdateLearners,
    handleSaveChanges
  };
};