"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAcademicSelection } from '@/hooks/useAcademicSelection';
import { useAcademicMigration } from '@/hooks/useAcademicMigration';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AcademicContextType {
  years: AcademicYear[];
  terms: Term[];
  assessments: Assessment[];
  marks: AssessmentMark[];
  loading: boolean;
  activeYear: AcademicYear | null;
  activeTerm: Term | null;
  setActiveYear: (year: AcademicYear | null) => void;
  setActiveTerm: (term: Term | null) => void;
  createYear: (name: string) => Promise<void>;
  deleteYear: (yearId: string) => Promise<void>;
  updateTerm: (term: Term) => Promise<void>;
  createAssessment: (assessment: Omit<Assessment, 'id'>) => Promise<string>;
  updateAssessment: (assessment: Assessment) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  updateMarks: (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => Promise<void>;
  refreshAssessments: (classId: string, termId?: string) => Promise<void>;
  toggleTermStatus: (termId: string, finalised: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
  recalculateAllActiveAverages: (silent?: boolean) => Promise<void>;
  runDataVacuum: () => Promise<void>;
  rollForwardClasses: (sourceTermId: string, targetTermId: string, preparedClasses: any[]) => Promise<void>;
  diagnosticMode: boolean;
  setDiagnosticMode: (active: boolean) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [currentClassFilter, setCurrentClassFilter] = useState<{classId: string, termId: string} | null>(null);
  const queryClient = useQueryClient();

  const { data: years = [], isLoading: loadingYears } = useQuery({
    queryKey: ['academic_years', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase.from('academic_years').select('*').eq('user_id', session.user.id).order('name', { ascending: false });
      if (error) throw error;
      return data as AcademicYear[];
    },
    enabled: !!session?.user?.id
  });

  const { data: allTerms = [], isLoading: loadingTerms } = useQuery({
    queryKey: ['terms', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase.from('terms').select('*').eq('user_id', session.user.id);
      if (error) throw error;
      return data as Term[];
    },
    enabled: !!session?.user?.id
  });
  
  const { activeYear, activeTerm, setActiveYear, setActiveTerm } = useAcademicSelection(years, allTerms);

  const terms = useMemo(() => {
    const list = diagnosticMode ? allTerms : (activeYear ? allTerms.filter(t => t.year_id === activeYear.id) : []);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [allTerms, activeYear?.id, diagnosticMode]);

  const { data: assessments = [], isLoading: loadingAss } = useQuery({
    queryKey: ['assessments', session?.user?.id, currentClassFilter?.classId, currentClassFilter?.termId, diagnosticMode, activeYear?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      if (diagnosticMode) {
          const { data } = await supabase.from('assessments').select('*').eq('user_id', session.user.id);
          return data || [];
      }
      if (!currentClassFilter || !activeYear) return [];
      const { data } = await supabase.from('assessments')
        .select('*')
        .eq('class_id', currentClassFilter.classId)
        .eq('term_id', currentClassFilter.termId)
        .eq('user_id', session.user.id);
      return data || [];
    },
    enabled: !!session?.user?.id && (diagnosticMode || !!currentClassFilter)
  });

  const { data: marks = [] } = useQuery({
    queryKey: ['assessment_marks', session?.user?.id, assessments.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      if (diagnosticMode) {
          const { data } = await supabase.from('assessment_marks').select('*').eq('user_id', session.user.id);
          return data || [];
      }
      if (assessments.length === 0) return [];
      const assIds = assessments.map((a: any) => a.id);
      
      // Batch fetch marks if many assessments
      const chunkSize = 100;
      let allData: any[] = [];
      for (let i = 0; i < assIds.length; i += chunkSize) {
          const chunk = assIds.slice(i, i + chunkSize);
          const { data } = await supabase.from('assessment_marks')
            .select('*')
            .in('assessment_id', chunk)
            .eq('user_id', session.user.id);
          if (data) allData = [...allData, ...data];
      }
      return allData;
    },
    enabled: !!session?.user?.id && (diagnosticMode || assessments.length > 0)
  });

  const { updateLearnerActiveAverages, recalculateAllActiveAverages, runDataVacuum } = useAcademicAverages();
  
  const logInternalActivity = useCallback(async (message: string, yearId?: string, termId?: string) => {
    if (!session?.user?.id) return;
    const targetYearId = yearId || activeYear?.id;
    const targetTermId = termId || activeTerm?.id;
    
    if (!targetYearId || !targetTermId) return;

    const newActivity = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      year_id: targetYearId,
      term_id: targetTermId,
      message,
      timestamp: new Date().toISOString(),
    };
    await supabase.from('activities').insert(newActivity);
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  }, [session?.user?.id, activeYear?.id, activeTerm?.id, queryClient]);

  const { rollForwardClasses: doRollForward } = useAcademicMigration(
    session?.user?.id, 
    logInternalActivity
  );

  const createYear = useCallback(async (name: string) => {
    if (!session?.user?.id) return;
    const yearId = crypto.randomUUID();
    const yearData = { id: yearId, name, user_id: session.user.id, closed: false };
    
    await supabase.from('academic_years').insert(yearData);
    
    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((tName) => ({
      id: crypto.randomUUID(), 
      year_id: yearId, 
      name: tName, 
      user_id: session.user.id, 
      closed: false,
      is_finalised: false,
      weight: 25, 
    }));
    await supabase.from('terms').insert(termsToCreate);
    
    await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    await queryClient.invalidateQueries({ queryKey: ['terms'] });
    showSuccess(`Academic Year ${name} initialized.`);
  }, [session?.user?.id, queryClient]);

  const deleteYear = useCallback(async (id: string) => {
    await supabase.from('terms').delete().eq('year_id', id);
    await supabase.from('academic_years').delete().eq('id', id);
    await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    await queryClient.invalidateQueries({ queryKey: ['terms'] });
    showSuccess("Academic Year removed.");
  }, [queryClient]);

  const updateTerm = useCallback(async (term: Term) => {
    await supabase.from('terms').update(term).eq('id', term.id);
    await queryClient.invalidateQueries({ queryKey: ['terms'] });
    recalculateAllActiveAverages(true);
  }, [recalculateAllActiveAverages, queryClient]);

  const createAssessment = useCallback(async (assessment: Omit<Assessment, 'id'>) => {
    if (!assessment.term_id) throw new Error("Missing term scope");

    const id = crypto.randomUUID();
    const data = { ...assessment, id, user_id: session?.user?.id || '' };
    await supabase.from('assessments').insert(data);
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    return id;
  }, [session?.user?.id, queryClient]);

  const updateAssessment = useCallback(async (a: Assessment) => {
    await supabase.from('assessments').update(a).eq('id', a.id);
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
  }, [queryClient]);

  const deleteAssessment = useCallback(async (id: string) => {
    await supabase.from('assessment_marks').delete().eq('assessment_id', id); 
    await supabase.from('assessments').delete().eq('id', id);
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
  }, [queryClient]);

  const updateMarks = useCallback(async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user?.id || updates.length === 0) return;
    
    const toUpsert = await Promise.all(updates.map(async (u) => {
        const { data: existing } = await supabase.from('assessment_marks')
            .select('id')
            .eq('assessment_id', u.assessment_id)
            .eq('learner_id', u.learner_id)
            .single();
            
        return { ...u, id: existing?.id || crypto.randomUUID(), user_id: session.user.id } as AssessmentMark;
    }));
    
    await supabase.from('assessment_marks').upsert(toUpsert);
    await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
    await updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
  }, [session?.user?.id, updateLearnerActiveAverages, queryClient]);

  const refreshAssessments = useCallback(async (c: string, t?: string) => {
    const targetTermId = t || activeTerm?.id || '';
    setCurrentClassFilter(prev => {
      if (prev?.classId === c && prev?.termId === targetTermId) return prev;
      return { classId: c, termId: targetTermId };
    });
  }, [activeTerm?.id]);

  const toggleTermStatus = useCallback(async (termId: string, finalised: boolean) => {
    await supabase.from('terms').update({ is_finalised: finalised, closed: finalised }).eq('id', termId);
    await queryClient.invalidateQueries({ queryKey: ['terms'] });
    
    if (finalised) {
        logInternalActivity(`Finalised term: ${allTerms.find(t => t.id === termId)?.name}`);
    }
    showSuccess(`Term ${finalised ? 'finalised and locked' : 're-activated'}.`);
  }, [allTerms, logInternalActivity, queryClient]);

  const closeYear = useCallback(async (id: string) => {
    await supabase.from('academic_years').update({ closed: true }).eq('id', id);
    await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    showSuccess("Year cycle finalized.");
  }, [queryClient]);

  const rollForwardClasses = useCallback((s: string, t: string, d: any[]) => 
    doRollForward(activeYear?.id || '', s, t, d, setActiveTerm), 
  [doRollForward, activeYear?.id, setActiveTerm]);

  const value = useMemo(() => ({
    years, terms, assessments, marks, 
    loading: loadingYears || loadingTerms || !session?.user?.id, 
    activeYear, activeTerm, setActiveYear, setActiveTerm, 
    createYear, deleteYear, updateTerm,
    createAssessment, updateAssessment, deleteAssessment,
    updateMarks, refreshAssessments, toggleTermStatus, closeYear,
    recalculateAllActiveAverages, runDataVacuum, rollForwardClasses,
    diagnosticMode, setDiagnosticMode
  }), [
    years, terms, assessments, marks, activeYear, activeTerm, 
    setActiveYear, setActiveTerm, createYear, deleteYear, updateTerm, 
    createAssessment, updateAssessment, deleteAssessment, updateMarks, 
    refreshAssessments, toggleTermStatus, closeYear, recalculateAllActiveAverages, 
    runDataVacuum, rollForwardClasses, diagnosticMode, session?.user?.id, loadingYears, loadingTerms
  ]);

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) throw new Error('useAcademic must be used within an AcademicProvider');
  return context;
};