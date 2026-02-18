"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TeacherFileAnnotation } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';

export const useTeacherFileAnnotations = (yearId: string | undefined, termId: string | null, sectionKey: string) => {
  const annotation = useLiveQuery(
    () => (yearId && sectionKey) 
      ? db.teacher_file_annotations
          .where({ academic_year_id: yearId, term_id: termId, section_key: sectionKey })
          .first()
      : undefined,
    [yearId, termId, sectionKey]
  );

  const [localContent, setLocalContent] = useState("");

  useEffect(() => {
    if (annotation) {
      setLocalContent(annotation.content);
    } else {
      setLocalContent("");
    }
  }, [annotation]);

  const saveAnnotation = useCallback(async (content: string) => {
    if (!yearId || !sectionKey) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: TeacherFileAnnotation = {
        id: annotation?.id || crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId,
        section_key: sectionKey,
        content,
        updated_at: new Date().toISOString()
      };

      await db.teacher_file_annotations.put(payload);
      await queueAction('teacher_file_annotations', 'upsert', payload);
    } catch (e) {
      console.error("[Annotations] Save failed:", e);
    }
  }, [yearId, termId, sectionKey, annotation?.id]);

  return { 
    content: localContent, 
    setContent: setLocalContent, 
    saveAnnotation, 
    isDraft: localContent !== (annotation?.content || "")
  };
};