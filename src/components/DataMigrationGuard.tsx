"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db';
import { CloudDownload, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const DataMigrationGuard = ({ children }: { children: React.ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Initializing...");
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    
    const syncData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isMounted) setIsSyncing(false);
        return;
      }

      if (isMounted) setSyncStatus("Clearing cache...");
      // 1. Clear React Query cache to ensure fresh data fetch
      queryClient.clear();

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

      // 2. Push local data first to prevent data loss if you had unsynced local data
      try {
        if (isMounted) setSyncStatus("Pushing local offline changes to cloud...");
        for (const table of tables) {
          if (!(db as any)[table]) continue;
          const localData = await (db as any)[table].toArray();
          
          if (localData.length > 0) {
            for (let i = 0; i < localData.length; i += 50) {
                const chunk = localData.slice(i, i + 50).map((item: any) => {
                    const payload = { ...item };
                    delete payload.sync_status;
                    
                    // Map fields correctly for Supabase
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
                    
                    // Enforce user_id for RLS safety. 
                    // IMPORTANT: The learners table is secured via class_id and does NOT have a user_id column.
                    if (!payload.user_id && !['profiles', 'teacherfile_template_sections', 'teacherfile_entry_attachments', 'learners'].includes(table)) {
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

      // 3. Pull remote data down and overwrite Dexie
      try {
        if (isMounted) setSyncStatus("Pulling latest data from cloud...");
        
        for (const table of tables) {
          if (!(db as any)[table]) continue;
          
          // Use limit 10000 to confidently capture user's records instead of PostgREST 1000 default
          const { data, error } = await supabase.from(table).select('*').limit(10000);
          
          if (!error && data) {
            await (db as any)[table].clear();
            if (data.length > 0) {
                const mappedData = data.map((item: any) => {
                    const localItem = { ...item };
                    if (table === 'classes' && item.class_name !== undefined) {
                        localItem.className = item.class_name;
                    }
                    return localItem;
                });
                await (db as any)[table].bulkPut(mappedData);
            }
          } else if (error) {
            console.error(`[Sync] Failed to pull ${table}`, error);
          }
        }
      } catch (pullErr) {
        console.error("[Sync] Error during pull phase:", pullErr);
      }
        
      if (isMounted) setSyncStatus("Finalizing...");
      
      // 4. Ensure all active queries rerun with the freshly synced data
      await queryClient.invalidateQueries();

      if (isMounted) setIsSyncing(false);
    };

    syncData();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  if (isSyncing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
        <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <CloudDownload className="w-6 h-6 animate-bounce" />
            </div>
            <CardTitle className="text-2xl font-bold">Workspace Sync</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              Ensuring your data is identical across all devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center pb-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-700 animate-pulse">{syncStatus}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};