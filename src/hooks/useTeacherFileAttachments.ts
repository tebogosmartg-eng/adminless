"use client";

import { useState } from 'react';
import { db } from '@/db';
import { TeacherFileAttachment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/services/storage';
import { showSuccess, showError } from '@/utils/toast';
import { useLiveQuery } from '@/lib/dexie-react-hooks';

export const useTeacherFileAttachments = (
  yearId: string | undefined, 
  termId: string | undefined, 
  sectionKey: string,
  assessmentId: string | null = null
) => {
  const [isUploading, setIsUploading] = useState(false);

  // Scoped Query: Must match year, term (or null for year-level), and section
  const attachments = useLiveQuery(
    async () => {
      if (!yearId || !sectionKey) return [];
      
      const filters: any = { 
          academic_year_id: yearId, 
          section_key: sectionKey 
      };
      
      if (termId !== undefined) {
          filters.term_id = termId || null;
      }

      let query = db.teacher_file_attachments.where(filters);

      const results = await query.toArray();
      
      // Secondary filter for assessment-specific attachments if needed
      if (assessmentId) {
          return results.filter((a: any) => a.assessment_id === assessmentId);
      }
      return results;
    },
    [yearId, termId, sectionKey, assessmentId]
  ) || [];

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

      const newAttachment: TeacherFileAttachment = {
        id: crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId || null, 
        section_key: sectionKey,
        assessment_id: assessmentId,
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