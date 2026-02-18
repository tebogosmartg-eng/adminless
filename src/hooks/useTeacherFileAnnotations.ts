"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TeacherFileAnnotation } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { useSync } from '@/context/SyncContext';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued';

export const useTeacherFileAnnotations = (yearId: string | undefined, termId: string | null, sectionKey: string) => {
  const { isOnline } = useSync();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [localContent, setLocalContent] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const annotation = useLiveQuery(
    () => (yearId && sectionKey) 
      ? db.teacher_file_annotations
          .where({ academic_year_id: yearId, term_id: termId, section_key: sectionKey })
          .first()
      : undefined,
    [yearId, termId, sectionKey]
  );

  // Sync local state with database when it loads
  useEffect(() => {
    if (annotation) {
      setLocalContent(annotation.content);
    } else {
      setLocalContent("");
    }
  }, [annotation?.id]);

  const performSave = useCallback(async (content: string) => {
    if (!yearId || !sectionKey) return;

    setStatus('saving');
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
      
      setStatus(isOnline ? 'saved' : 'queued');
      
      // Reset to idle after a few seconds of showing "Saved"
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error("[Annotations] Save failed:", e);
      setStatus('idle');
    }
  }, [yearId, termId, sectionKey, annotation?.id, isOnline]);

  const updateContent = (content: string) => {
    setLocalContent(content);
    
    // Debounce logic: 800ms
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      performSave(content);
    }, 800);
  };

  return { 
    content: localContent, 
    updateContent,
    status,
    isDraft: localContent !== (annotation?.content || "")
  };
};