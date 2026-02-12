"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAcademic } from '@/context/AcademicContext';

export interface AuditRecord {
  id: string;
  created_at: string;
  year_id?: string;
  term_id?: string;
  title_or_name: string;
}

export const useSupabaseAudit = () => {
  const { activeYear, activeTerm } = useAcademic();
  const [isAuditing, setIsAuditing] = useState(false);
  const [results, setResults] = useState<{
    classes: AuditRecord[];
    assessments: AuditRecord[];
    marks: AuditRecord[];
    contextMatched: boolean;
  } | null>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      // 1. Query Classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, created_at, year_id, term_id, class_name')
        .order('created_at', { ascending: false })
        .limit(5);

      // 2. Query Assessments
      const { data: assData } = await supabase
        .from('assessments')
        .select('id, created_at, year_id, term_id, title')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Query Marks
      const { data: markData } = await supabase
        .from('assessment_marks')
        .select('id, created_at, year_id, term_id, score')
        .order('created_at', { ascending: false })
        .limit(5);

      const mappedClasses = (classData || []).map(c => ({
        id: c.id,
        created_at: c.created_at,
        year_id: c.year_id,
        term_id: c.term_id,
        title_or_name: c.class_name
      }));

      const mappedAss = (assData || []).map(a => ({
        id: a.id,
        created_at: a.created_at,
        year_id: a.year_id,
        term_id: a.term_id,
        title_or_name: a.title
      }));

      const mappedMarks = (markData || []).map(m => ({
        id: m.id,
        created_at: m.created_at,
        year_id: m.year_id,
        term_id: m.term_id,
        title_or_name: `Score: ${m.score}`
      }));

      // Check if latest records match current context
      const latestClass = mappedClasses[0];
      const contextMatched = latestClass 
        ? (latestClass.year_id === activeYear?.id && latestClass.term_id === activeTerm?.id)
        : true;

      setResults({
        classes: mappedClasses,
        assessments: mappedAss,
        marks: mappedMarks,
        contextMatched
      });
    } catch (error) {
      console.error("[audit] Supabase query failed:", error);
    } finally {
      setIsAuditing(false);
    }
  };

  return { runAudit, isAuditing, results, activeYear, activeTerm };
};