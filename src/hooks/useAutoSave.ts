import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions {
  isDirty: boolean;
  onSave: () => Promise<void>;
  delayMs?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  isDirty,
  onSave,
  delayMs = 1200,
  enabled = true,
}: UseAutoSaveOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const [didSave, setDidSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success" | "error">("idle");

  const onSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);
  const queueAnotherSaveRef = useRef(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const runSave = useCallback(async () => {
    if (isSavingRef.current) {
      queueAnotherSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setDidSave(false);
    setSaveError(null);
    setSavePhase("saving");

    try {
      await onSaveRef.current();
      setDidSave(true);
      setSavePhase("success");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to auto-save.");
      setSavePhase("error");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);

      if (queueAnotherSaveRef.current) {
        queueAnotherSaveRef.current = false;
        void runSave();
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runSave();
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, enabled, isDirty, runSave]);

  useEffect(() => {
    if (isDirty) {
      setDidSave(false);
      if (savePhase === "success") {
        setSavePhase("idle");
      }
    }
  }, [isDirty, savePhase]);

  return {
    isSaving,
    didSave,
    saveError,
    savePhase,
    retryLastSave: runSave,
  };
};
