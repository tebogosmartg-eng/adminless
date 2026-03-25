"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const DataMigrationGuard = ({ children }: { children: React.ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    
    const syncData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (isMounted) setIsSyncing(true);

      const tables = [
        'academic_years', 'terms', 'classes', 'learners',
        'assessments', 'assessment_marks', 'activities', 'todos',
        'attendance', 'timetable', 'learner_notes', 'evidence',
        'rubrics', 'lesson_logs', 'curriculum_topics', 'diagnostics',
        'teacher_file_annotations', 'teacher_file_attachments',
        'moderation_samples', 'scan_jobs', 'teacherfile_templates',
        'teacherfile_template_sections', 'teacherfile_entries',
        'teacherfile_entry_attachments', 'review_snapshots', 'remediation_tasks', 'scan_history'
      ];

      // 1. Push local data to cloud (Upsert)
      try {
        for (const table of tables) {
          if (!(db as any)[table]) continue;
          const localData = await (db as any)[table].toArray();
          
          if (localData.length > 0) {
            for (let i = 0; i < localData.length; i += 50) {
                const chunk = localData.slice(i, i + 50).map((item: any) => {
                    const payload = { ...item };
                    delete payload.sync_status;
                    
                    if (table === 'classes' && payload.className !== undefined) {
                        payload.class_name = payload.className;
                        delete payload.className;
                    }
                    if (table === 'assessments') {
                        if (payload.max !== undefined) {
                            payload.max_mark = payload.max;
                            delete payload.max;
                        }
                        if (payload.termId && !payload.term_id) {
                            payload.term_id = payload.termId;
                        }
                        delete payload.termId;
                    }
                    
                    if (!payload.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(table)) {
                        payload.user_id = session.user.id;
                    }
                    return payload;
                });
                
                const { error: upsertError } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
                if (upsertError) {
                    console.warn(`[Sync] Failed to push ${table}`, upsertError);
                }
            }
          }
        }
      } catch (pushErr) {
        console.error("[Sync] Error during push phase:", pushErr);
      }

      // 2. Pull remote data and gracefully merge into local Dexie cache
      try {
        for (const table of tables) {
          if (!(db as any)[table]) continue;
          
          const hasUserId = !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(table);
          let query = supabase.from(table).select('*').limit(10000);
          
          if (hasUserId) {
              query = query.eq('user_id', session.user.id);
          } else if (table === 'profiles') {
              query = query.eq('id', session.user.id);
          }
          
          const { data, error } = await query;
          
          if (!error && data) {
            const mappedData = data.map((item: any) => {
                const localItem = { ...item };
                if (table === 'classes' && item.class_name !== undefined) {
                    localItem.className = item.class_name;
                }
                return localItem;
            });
            
            // Insert or update records
            if (mappedData.length > 0) {
                await (db as any)[table].bulkPut(mappedData);
            }

            // Prune local records that were deleted on other devices
            const remoteIds = new Set(data.map((d: any) => d.id));
            const localRecords = await (db as any)[table].toArray();
            const toDelete = localRecords.filter((r: any) => !remoteIds.has(r.id)).map((r: any) => r.id);
            
            if (toDelete.length > 0) {
                await (db as any)[table].bulkDelete(toDelete);
            }
          } else if (error) {
            console.error(`[Sync] Failed to pull ${table}`, error);
          }
        }
      } catch (pullErr) {
        console.error("[Sync] Error during pull phase:", pullErr);
      }
      
      // 3. Ensure active queries update seamlessly 
      await queryClient.invalidateQueries();

      if (isMounted) setIsSyncing(false);
    };

    syncData();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  return (
    <>
      {children}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-bold animate-in slide-in-from-bottom-5 no-print pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing Workspace...</span>
        </div>
      )}
    </>
  );
};