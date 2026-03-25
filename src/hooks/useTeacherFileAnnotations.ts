"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/db';
import { TeacherFileAnnotation } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued';

export const useTeacherFileAnnotations = (yearId: string | undefined, termId: string | undefined, sectionKey: string) => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [localContent, setLocalContent] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const loadInitial = async () => {
        // Enforce strict context: if we are in a term-based section, we MUST have a yearId and sectionKey
        if (!yearId || !sectionKey) return;
        
        try {
            // Build filter dynamically to avoid passing undefined values
            const filters: any = { 
                academic_year_id: yearId, 
                section_key: sectionKey 
            };
            if (termId !== undefined) {
                filters.term_id = termId || null;
            }

            const annotation = await db.teacher_file_annotations
                .where(filters)
                .first();
            
            if (isMounted.current) {
                setLocalContent(annotation?.content || "");
            }
        } catch (e) {
            console.error("[Annotations] Initial load failed", e);
        }
    };

    loadInitial();

    return () => {
        isMounted.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [yearId, termId, sectionKey]);

  const performSave = useCallback(async (content: string) => {
    if (!yearId || !sectionKey) return;

    if (isMounted.current) setStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filters: any = { 
          academic_year_id: yearId, 
          section_key: sectionKey 
      };
      if (termId !== undefined) {
          filters.term_id = termId || null;
      }

      const existing = await db.teacher_file_annotations
          .where(filters)
          .first();

      const payload: TeacherFileAnnotation = {
        id: existing?.id || crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId || null, // Explicitly scope to current term
        section_key: sectionKey,
        content,
        updated_at: new Date().toISOString()
      };

      await db.teacher_file_annotations.put(payload);
      await queueAction('teacher_file_annotations', 'upsert', payload);
      
      if (isMounted.current) {
          setStatus(navigator.onLine ? 'saved' : 'queued');
          setTimeout(() => { if(isMounted.current) setStatus('idle'); }, 3000);
      }
    } catch (e) {
      console.error("[Annotations] Save failed:", e);
      if (isMounted.current) setStatus('idle');
    }
  }, [yearId, termId, sectionKey]);

  const updateContent = (content: string) => {
    setLocalContent(content);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      performSave(content);
    }, 800);
  };

  return { 
    content: localContent, 
    updateContent,
    status
  };
};