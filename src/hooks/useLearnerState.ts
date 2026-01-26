import { useState, useEffect, useCallback, useRef } from 'react';
import { Learner, ClassInfo } from '@/lib/types';
import { showSuccess } from '@/utils/toast';
import confetti from 'canvas-confetti';

export const useLearnerState = (
  classInfo: ClassInfo | undefined,
  updateLearnersContext: (classId: string, learners: Learner[]) => void
) => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [prevGradedCount, setPrevGradedCount] = useState(0);
  
  // Ref to track the last learners array from context that we synced with
  const lastSyncedLearnersRef = useRef<Learner[] | null>(null);

  useEffect(() => {
    if (classInfo) {
      // Only update local state if the learners array reference has changed
      // This prevents overwriting local edits when classInfo updates for other reasons (e.g. renaming class)
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

  const handleMarkChange = useCallback((index: number, mark: string) => {
    setLearners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mark };
      return updated;
    });
  }, []);

  const handleCommentChange = useCallback((index: number, comment: string) => {
    setLearners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], comment };
      return updated;
    });
  }, []);
  
  const handleRemoveLearner = useCallback((index: number) => {
    if (confirm("Are you sure you want to remove this learner?")) {
      setLearners(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  const handleBatchDelete = useCallback((indices: number[]) => {
    setLearners(prev => prev.filter((_, i) => !indices.includes(i)));
    showSuccess(`Deleted ${indices.length} learners.`);
  }, []);

  const handleBatchComment = useCallback((indices: number[], comment: string) => {
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
  }, []);

  const handleBatchClearMarks = useCallback((indices: number[]) => {
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
  }, []);

  const handleAddLearners = useCallback((input: string[] | Learner[]) => {
    let newLearners: Learner[] = [];
    
    if (input.length > 0 && typeof input[0] === 'string') {
        newLearners = (input as string[]).map(name => ({ name, mark: "" }));
    } else {
        newLearners = input as Learner[];
    }
    
    setLearners(prev => [...prev, ...newLearners]);
    showSuccess(`Added ${newLearners.length} learner(s). Remember to save changes.`);
  }, []);

  const handleClearMarks = useCallback(() => {
    if (confirm("Clear ALL marks and comments? This cannot be undone once saved.")) {
      setLearners(prev => prev.map(l => ({ ...l, mark: "", comment: "" })));
      showSuccess("All marks cleared. Click 'Save Changes' to confirm.");
    }
  }, []);

  const handleUpdateLearners = useCallback((updatedLearners: Learner[]) => {
    setLearners(updatedLearners);
  }, []);

  const handleSaveChanges = useCallback(() => {
    if (classInfo?.id) {
      updateLearnersContext(classInfo.id, learners);
      showSuccess("Changes have been saved successfully!");
      setHasUnsavedChanges(false);
    }
  }, [classInfo?.id, learners, updateLearnersContext]);

  return {
    learners,
    setLearners,
    hasUnsavedChanges,
    handleMarkChange,
    handleCommentChange,
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