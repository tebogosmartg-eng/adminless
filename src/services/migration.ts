import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';

export interface MigrationProgress {
  currentTable: string;
  completedTables: string[];
  totalTables: number;
  progress: number;
  status: 'idle' | 'migrating' | 'completed' | 'error';
  error?: string;
}

const TABLE_MAPPING: Record<string, string> = {
  classes: 'classes',
  learners: 'learners',
  academic_years: 'academic_years',
  terms: 'terms',
  assessments: 'assessments',
  assessment_marks: 'assessment_marks',
  activities: 'activities',
  todos: 'todos',
  attendance: 'attendance',
  timetable: 'timetable',
  learner_notes: 'learner_notes',
  evidence: 'evidence',
  rubrics: 'rubrics',
  lesson_logs: 'lesson_logs',
  curriculum_topics: 'curriculum_topics',
  diagnostics: 'diagnostics',
  teacher_file_annotations: 'teacher_file_annotations',
  teacher_file_attachments: 'teacher_file_attachments',
  moderation_samples: 'moderation_samples',
  scan_jobs: 'scan_jobs',
  teacherfile_templates: 'teacherfile_templates',
  teacherfile_template_sections: 'teacherfile_template_sections',
  teacherfile_entries: 'teacherfile_entries',
  teacherfile_entry_attachments: 'teacherfile_entry_attachments',
  review_snapshots: 'review_snapshots',
  profiles: 'profiles'
};

export const migrateAllData = async (onProgress: (p: MigrationProgress) => void) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    onProgress({
      currentTable: 'Error',
      completedTables: [],
      totalTables: 0,
      progress: 0,
      status: 'error',
      error: 'User session not found'
    });
    return;
  }

  const tables = Object.keys(TABLE_MAPPING);
  const completedTables: string[] = [];
  
  onProgress({
    currentTable: 'Starting...',
    completedTables: [],
    totalTables: tables.length,
    progress: 0,
    status: 'migrating'
  });

  try {
    for (let i = 0; i < tables.length; i++) {
      const dexieTable = tables[i];
      const supabaseTable = TABLE_MAPPING[dexieTable];
      
      onProgress({
        currentTable: dexieTable,
        completedTables: [...completedTables],
        totalTables: tables.length,
        progress: Math.round((i / tables.length) * 100),
        status: 'migrating'
      });

      // @ts-ignore
      const allData = await db[dexieTable].toArray();
      
      if (allData.length > 0) {
        console.log(`[Migration] Migrating ${allData.length} records for ${dexieTable}...`);
        
        // Process in chunks of 50 to avoid payload size issues
        const chunkSize = 50;
        for (let j = 0; j < allData.length; j += chunkSize) {
          const chunk = allData.slice(j, j + chunkSize);
          
          const processedChunk = chunk.map(item => {
            const payload = { ...item };
            
            // Ensure user_id is set
            if (!payload.user_id && dexieTable !== 'profiles' && dexieTable !== 'academic_years' && dexieTable !== 'terms') {
              payload.user_id = user.id;
            }
            
            // Academic years and terms in Supabase usually have user_id too
            if (dexieTable === 'academic_years' || dexieTable === 'terms') {
              if (!payload.user_id) payload.user_id = user.id;
            }

            // Handle field mapping differences
            if (dexieTable === 'classes') {
              if (payload.className !== undefined) {
                payload.class_name = payload.className;
                delete payload.className;
              }
            }
            
            if (dexieTable === 'assessments') {
                if (payload.max !== undefined) {
                    payload.max_mark = payload.max;
                    delete payload.max;
                }
                if (payload.termId && !payload.term_id) {
                    payload.term_id = payload.termId;
                }
                delete payload.termId;
            }

            // Remove Dexie-only fields
            delete payload.sync_status;
            
            return payload;
          });

          const { error } = await supabase.from(supabaseTable as any).upsert(processedChunk);
          
          if (error) {
            console.error(`[Migration:Error] Failed to migrate chunk for ${dexieTable}:`, error);
          }
        }
      }

      completedTables.push(dexieTable);
    }
    
    // Set migration completion flag
    localStorage.setItem('sma_migration_v2_complete', 'true');
    localStorage.setItem('sma_online_only_mode', 'true');

    onProgress({
      currentTable: 'Completed',
      completedTables: [...completedTables],
      totalTables: tables.length,
      progress: 100,
      status: 'completed'
    });
  } catch (err: any) {
    console.error("[Migration:Critical] Migration failed:", err);
    onProgress({
      currentTable: 'Error',
      completedTables: [...completedTables],
      totalTables: tables.length,
      progress: 100,
      status: 'error',
      error: err.message || 'Unknown migration error'
    });
  }
};