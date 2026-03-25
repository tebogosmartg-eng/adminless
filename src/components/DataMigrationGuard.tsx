"use client";

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db';
import { useQueryClient } from '@tanstack/react-query';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';

export const DataMigrationGuard = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { recalculateAllActiveAverages } = useAcademicAverages();

  useEffect(() => {
    let isMounted = true;
    
    const syncData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 0. Background Maintenance (Run silently on first load / login)
      try {
        const sessionKey = `adminless_maintenance_run_${session.user.id}`;
        const lastRun = sessionStorage.getItem(sessionKey);
        
        // Run once per browser session to fix orphans, recover email data, and repair averages automatically
        if (!lastRun) {
           console.log("[Background Maintenance] Auto-recovering and migrating data...");
           
           // Auto migrate orphaned data
           await supabase.functions.invoke('account-recovery', { body: { mode: 'fix-orphans' } });
           
           // Auto recover data from other emails
           await supabase.functions.invoke('account-recovery', { body: { mode: 'recover-email' } });
           
           // Auto repair averages
           await recalculateAllActiveAverages(true);
           
           sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (e) {
        console.warn("[Background Maintenance] Skipped or failed:", e);
      }

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
    };

    syncData();

    return () => {
      isMounted = false;
    };
  }, [queryClient, recalculateAllActiveAverages]);

  return <>{children}</>;
};