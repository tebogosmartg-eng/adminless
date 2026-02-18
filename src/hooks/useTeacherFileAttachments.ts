"use client";

import { useState, useEffect, useCallback } from 'react';
import { db, TeacherFileAttachment } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/services/storage';
import { showSuccess, showError } from '@/utils/toast';
import { useLiveQuery } from 'dexie-react-hooks';

export const useTeacherFileAttachments = (yearId: string | undefined, termId: string | undefined, sectionKey: string) => {
  const [isUploading, setIsUploading] = useState(false);

  const attachments = useLiveQuery(
    () => (yearId && termId && sectionKey) 
      ? db.teacher_file_attachments.where('[academic_year_id+term_id+section_key]').equals([yearId, termId, sectionKey]).toArray()
      : [],
    [yearId, termId, sectionKey]
  ) || [];

  const uploadAttachment = async (file: File) => {
    if (!yearId || !termId || !sectionKey) {
        showError("Academic context missing.");
        return;
    }
    
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      const { path } = await uploadEvidenceFile(file, user.id);

      const newAttachment: TeacherFileAttachment = {
        id: crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId,
        section_key: sectionKey,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        created_at: new Date().toISOString()
      };

      await db.teacher_file_attachments.add(newAttachment);
      await queueAction('teacher_file_attachments', 'create', newAttachment);
      
      showSuccess(`Attached "${file.name}" to section.`);
    } catch (e: any) {
      console.error(e);
      showError("Upload failed: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAttachment = async (item: TeacherFileAttachment) => {
    try {
      await deleteEvidenceFile(item.file_path);
      await db.teacher_file_attachments.delete(item.id);
      await queueAction('teacher_file_attachments', 'delete', { id: item.id });
      showSuccess("Attachment removed.");
    } catch (e) {
      showError("Failed to delete.");
    }
  };

  return { attachments, uploadAttachment, deleteAttachment, isUploading };
};