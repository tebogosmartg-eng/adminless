"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Evidence } from "@/lib/types";
import { uploadEvidenceFile, deleteEvidenceFile } from "@/services/storage";
import { showSuccess, showError } from "@/utils/toast";
import { useAcademic } from "@/context/AcademicContext";

export const useEvidence = (filters: { classId?: string; learnerId?: string }) => {
  const { activeYear, activeTerm } = useAcademic();

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH EVIDENCE FROM SUPABASE
  const fetchEvidence = async () => {
    if (!activeTerm?.id || !activeYear?.id) {
      setEvidenceList([]);
      setLoading(false);
      return;
    }
  
    setLoading(true);
  
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
  
      if (!user) {
        console.error("❌ No session");
        setEvidenceList([]);
        return;
      }
  
      let query = supabase
        .from("evidence")
        .select("*")
        .eq("term_id", activeTerm.id)
        .eq("academic_year_id", activeYear.id)
        .eq("user_id", user.id);
  
      if (filters.classId) {
        query = query.eq("class_id", filters.classId);
      }
  
      if (filters.learnerId) {
        query = query.eq("learner_id", filters.learnerId);
      }
  
      const { data, error } = await query;
  
      if (error) throw error;
  
      console.log("✅ EVIDENCE:", data);
      setEvidenceList(data || []);
  
    } catch (err: any) {
      console.error("❌ Fetch error:", err.message);
      showError("Failed to load evidence");
      setEvidenceList([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ADD EVIDENCE (UPLOAD + SAVE)
  const addEvidence = async (
    file: File,
    category: Evidence["category"],
    notes?: string
  ) => {
    if (!filters.classId || !activeYear || !activeTerm) {
      showError("Academic context required.");
      return;
    }

    setIsUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) throw new Error("Auth required");

      // Upload file
      const { path } = await uploadEvidenceFile(file, user.id);

      const newEvidence = {
        user_id: user.id,
        class_id: filters.classId,
        learner_id: filters.learnerId || null,
        term_id: activeTerm.id,
        academic_year_id: activeYear.id,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        category,
        notes: notes || ""
      };

      const { error } = await supabase
        .from("evidence")
        .insert([newEvidence]);

      if (error) throw error;

      showSuccess("Evidence attached successfully.");

      // 🔁 REFRESH DATA
      setEvidenceList(prev => [...prev, newEvidence as Evidence]);

    } catch (e: any) {
      console.error(e);
      showError("Upload failed: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 🔥 DELETE EVIDENCE
  const deleteEvidence = async (item: Evidence) => {
    try {
      await deleteEvidenceFile(item.file_path);

      const { error } = await supabase
        .from("evidence")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setEvidenceList(prev => prev.filter(e => e.id !== item.id));

      showSuccess("Evidence removed.");
    } catch (e) {
      console.error(e);
      showError("Failed to delete.");
    }
  };

  return {
    evidenceList,
    addEvidence,
    deleteEvidence,
    isUploading,
    loading
  };
};