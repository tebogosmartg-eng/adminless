"use client";

import { useState, useEffect } from "react";
import { TeacherFileAttachment } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { uploadEvidenceFile, deleteEvidenceFile } from "@/services/storage";
import { showSuccess, showError } from "@/utils/toast";

export const useTeacherFileAttachments = (
  yearId: string | undefined,
  termId: string | undefined,
  sectionKey: string,
  assessmentId: string | null = null
) => {
  const [attachments, setAttachments] = useState<TeacherFileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH ATTACHMENTS
  useEffect(() => {
    let isMounted = true;

    const fetchAttachments = async () => {
      if (!yearId || !sectionKey) {
        if (isMounted) {
          setAttachments([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      let query = supabase
        .from("teacher_file_attachments")
        .select("*")
        .eq("academic_year_id", yearId)
        .eq("section_key", sectionKey);

      if (termId !== undefined) {
        query = query.eq("term_id", termId || null);
      }

      if (assessmentId) {
        query = query.eq("assessment_id", assessmentId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch attachments error:", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setAttachments(data || []);
        setLoading(false);
      }
    };

    fetchAttachments();

    return () => {
      isMounted = false;
    };
  }, [yearId, termId, sectionKey, assessmentId]);

  // 🔥 UPLOAD
  const uploadAttachment = async (file: File) => {
    if (!yearId || !sectionKey) {
      showError("Academic context missing.");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      const { path } = await uploadEvidenceFile(file, user.id);

      const payload = {
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId || null,
        section_key: sectionKey,
        assessment_id: assessmentId,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
      };

      const { data, error } = await supabase
        .from("teacher_file_attachments")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setAttachments(prev => [data, ...prev]);

      showSuccess(`Attached "${file.name}" to section.`);
    } catch (e: any) {
      console.error(e);
      showError("Upload failed: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 🔥 DELETE
  const deleteAttachment = async (item: TeacherFileAttachment) => {
    try {
      await deleteEvidenceFile(item.file_path);

      const { error } = await supabase
        .from("teacher_file_attachments")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== item.id));

      showSuccess("Attachment removed.");
    } catch (e) {
      console.error(e);
      showError("Failed to delete.");
    }
  };

  return { attachments, loading, uploadAttachment, deleteAttachment, isUploading };
};