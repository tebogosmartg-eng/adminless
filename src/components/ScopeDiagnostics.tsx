"use client";

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db';

/**
 * Diagnostic Tool: Audits the scoping (year_id, term_id) of records 
 * across both local Dexie and remote Supabase storage.
 */
export const ScopeDiagnostics = () => {
  useEffect(() => {
    const runDiagnostics = async () => {
      console.log("%c[Diagnostic] Starting Scope Audit...", "color: #f59e0b; font-weight: bold; font-size: 14px;");

      const activeYearId = localStorage.getItem('adminless_active_year_id');
      const activeTermId = localStorage.getItem('adminless_active_term_id');

      console.log("[Diagnostic] Current Active Context:", {
        activeYearId,
        activeTermId
      });

      // Tables requested by user + internal names
      const tableConfig = [
        { label: 'classes', dbName: 'classes' },
        { label: 'learners', dbName: 'learners' },
        { label: 'assessments', dbName: 'assessments' },
        { label: 'marks', dbName: 'assessment_marks' },
        { label: 'attendance', dbName: 'attendance' }
      ];

      for (const config of tableConfig) {
        console.group(`Table Analysis: ${config.label} (${config.dbName})`);
        
        try {
            // 1. Audit Local (Dexie)
            // @ts-ignore
            const localRecords = await db[config.dbName].toArray();
            const localGroups: Record<string, number> = {};
            
            localRecords.forEach((r: any) => {
               // Normalise keys (some might use academic_year_id or year_id)
               const y = r.year_id || r.academic_year_id || 'MISSING';
               const t = r.term_id || 'MISSING';
               const key = `Year: ${y} | Term: ${t}`;
               localGroups[key] = (localGroups[key] || 0) + 1;
            });

            console.log(`Local Records Total: ${localRecords.length}`);
            if (localRecords.length > 0) {
                console.table(localGroups);
            }

            // 2. Audit Remote (Supabase)
            const { data: remoteRecords, error } = await supabase.from(config.dbName as any).select('*');
            
            if (error) {
                console.error(`Remote query failed for ${config.label}:`, error.message);
            } else if (remoteRecords) {
                const remoteGroups: Record<string, number> = {};
                remoteRecords.forEach((r: any) => {
                   const y = r.year_id || r.academic_year_id || 'MISSING';
                   const t = r.term_id || 'MISSING';
                   const key = `Year: ${y} | Term: ${t}`;
                   remoteGroups[key] = (remoteGroups[key] || 0) + 1;
                });

                console.log(`Remote Records Total: ${remoteRecords.length}`);
                if (remoteRecords.length > 0) {
                    console.table(remoteGroups);
                }
            }
        } catch (err) {
            console.error(`Diagnostic error processing ${config.label}:`, err);
        }
        
        console.groupEnd();
      }
      
      console.log("%c[Diagnostic] Scope Audit Complete. Check the groups above for discrepancies.", "color: #f59e0b; font-weight: bold;");
    };

    runDiagnostics();
  }, []);

  return null;
};