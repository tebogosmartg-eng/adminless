"use client";

import { useState } from 'react';
import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export const useAlignmentDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    console.group("🔍 AdminLess Data Alignment Diagnostic");
    
    try {
      // 1. Log authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 Authenticated User UUID:", user?.id || "Not Authenticated");
      console.log("📧 User Email:", user?.email || "N/A");

      // 2. Log active context from Storage
      const activeYearId = localStorage.getItem('adminless_active_year_id');
      const activeTermId = localStorage.getItem('adminless_active_term_id');
      console.log("📍 Active Context (Local Storage):", { activeYearId, activeTermId });

      // 3. Query Academic Years
      const allYears = await db.academic_years.toArray();
      console.log("📅 All Academic Years in DB:", allYears.map(y => ({ 
        id: y.id, 
        name: y.name, 
        closed: y.closed,
        isActive: y.id === activeYearId 
      })));

      // 4. Query Terms
      const allTerms = await db.terms.toArray();
      console.log("📆 All Terms in DB:", allTerms.map(t => ({ 
        id: t.id, 
        name: t.name, 
        year_id: t.year_id,
        closed: t.closed,
        isActive: t.id === activeTermId 
      })));

      // 5. Query Classes Grouped by Year
      const allClasses = await db.classes.toArray();
      const classGroups: Record<string, number> = {};
      allClasses.forEach(c => {
        const key = c.year_id || 'UNLINKED';
        classGroups[key] = (classGroups[key] || 0) + 1;
      });
      console.log("📚 Classes Count by Year ID:", classGroups);
      console.log("📝 Total Classes Unfiltered:", allClasses.length);

      // 6. Query Assessments Grouped by Year (via Term)
      const allAssessments = await db.assessments.toArray();
      const termMap = new Map(allTerms.map(t => [t.id, t.year_id]));
      const assGroups: Record<string, number> = {};
      
      allAssessments.forEach(a => {
        const yearId = termMap.get(a.term_id) || 'UNLINKED';
        assGroups[yearId] = (assGroups[yearId] || 0) + 1;
      });
      console.log("📊 Assessments Count by Year ID:", assGroups);
      console.log("📈 Total Assessments Unfiltered:", allAssessments.length);

      // 7. Check for Orphaned Data
      const orphanedLearners = await db.learners.filter(l => !allClasses.some(c => c.id === l.class_id)).count();
      if (orphanedLearners > 0) {
        console.warn(`⚠️ Detected ${orphanedLearners} orphaned learners (not linked to any class).`);
      }

      showSuccess("Diagnostic complete. Check browser console for full report.");
    } catch (err: any) {
      console.error("❌ Diagnostic Failed:", err);
      showError("Diagnostic failed: " + err.message);
    } finally {
      console.groupEnd();
      setIsRunning(false);
    }
  };

  return { runDiagnostic, isRunning };
};