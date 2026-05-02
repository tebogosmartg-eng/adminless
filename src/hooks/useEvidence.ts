"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Evidence } from "@/lib/types";
import { uploadEvidenceFile, deleteEvidenceFile } from "@/services/storage";
import { showSuccess, showError } from "@/utils/toast";
import { useAcademic } from "@/context/AcademicContext";
import { useAsyncState } from "@/hooks/useAsyncState";

export const useEvidence = (
  filters: { classId?: string; learnerId?: string; termId?: string },
  options?: { isLocked?: boolean },
) => {
  const { activeYear, activeTerm } = useAcademic();
  const classId = filters.classId;
  const learnerId = filters.learnerId;
  const termId = filters.termId ?? activeTerm?.id;
  const yearId = activeYear?.id;
  const isLocked = options?.isLocked ?? false;

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isFetchingEvidence, setIsFetchingEvidence] = useState(false);
  const fetchInProgressRef = useRef(false);
  const contextKey = `${classId || "none"}::${termId || "none"}::${yearId || "none"}::${learnerId || "all"}`;
  const loadState = useAsyncState({ resetOnChangeKey: contextKey });
  const uploadState = useAsyncState({ resetOnChangeKey: contextKey });
  const deleteState = useAsyncState({ resetOnChangeKey: contextKey });

  // 🔥 FETCH EVIDENCE FROM SUPABASE
  const fetchEvidence = useCallback(async () => {
    if (!classId || !termId || !yearId) {
      setEvidenceList([]);
      setIsFetchingEvidence(false);
      return;
    }
    if (fetchInProgressRef.current) return;

    fetchInProgressRef.current = true;
    setIsFetchingEvidence(true);
    try {
      await loadState.run(async () => {
        console.log("[Evidence] fetch triggered");
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          throw new Error("Session expired");
        }

        let query = supabase
          .from("evidence")
          .select("*")
          .eq("term_id", termId)
          .eq("academic_year_id", yearId)
          .eq("user_id", user.id)
          .eq("class_id", classId);

        if (learnerId) {
          query = query.eq("learner_id", learnerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        setEvidenceList(data || []);
      }, { status: "loading" });
    } catch (error) {
      console.error("Evidence fetch error:", error);
    } finally {
      fetchInProgressRef.current = false;
      setIsFetchingEvidence(false);
    }
  }, [classId, learnerId, termId, yearId, loadState.run]);

  // 🔥 ADD EVIDENCE (UPLOAD + SAVE)
  const addEvidence = async (
    file: File,
    category: Evidence["category"],
    notes?: string
  ) => {
    if (isLocked) {
      showError("Evidence is locked for this finalized term.");
      return;
    }
    if (!classId || !yearId || !termId) {
      showError("Academic context required.");
      return;
    }

    try {
      const newEvidence = await uploadState.run(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) throw new Error("Session expired");

        const { path } = await uploadEvidenceFile(file, user.id);

        const evidenceRecord = {
          user_id: user.id,
          class_id: classId,
          learner_id: learnerId || null,
          term_id: termId,
          academic_year_id: yearId,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          category,
          notes: notes || ""
        };

        const { data, error } = await supabase
          .from("evidence")
          .insert([evidenceRecord])
          .select("*")
          .single();

        if (error) throw error;
        return data as Evidence;
      }, { status: "saving" });

      showSuccess("Saved ✓");
      setEvidenceList(prev => [...prev, newEvidence]);
    } catch {
      showError("Failed - Retry");
    }
  };

  // 🔥 DELETE EVIDENCE
  const deleteEvidence = async (item: Evidence) => {
    if (isLocked) {
      showError("Evidence is locked for this finalized term.");
      return;
    }
    try {
      await deleteState.run(async () => {
        await deleteEvidenceFile(item.file_path);
        const { error } = await supabase
          .from("evidence")
          .delete()
          .eq("id", item.id);

        if (error) throw error;
      }, { status: "saving" });
      setEvidenceList(prev => prev.filter(e => e.id !== item.id));
      showSuccess("Saved ✓");
    } catch {
      showError("Failed - Retry");
    }
  };

  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  return {
    evidenceList,
    addEvidence,
    deleteEvidence,
    isUploading: uploadState.status === "saving",
    loading: isFetchingEvidence,
    loadState,
    uploadState,
    deleteState,
    fetchEvidence,
  };
};