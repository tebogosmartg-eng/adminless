"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark, AssessmentQuestion } from '@/lib/types';
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
  createAssessment: (assessment: Omit<Assessment, 'id'>) => Promise<string | undefined>;
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
      try {
          const { data, error } = await supabase.from('academic_years').select('*').eq('user_id', session.user.id).order('name', { ascending: false });
          if (error) throw error;
          return data as AcademicYear[];
      } catch (e) {
          console.error("AdminLess error: Failed to fetch academic years", e);
          return [];
      }
    },
    enabled: !!session?.user?.id
  });

  const { data: allTerms = [], isLoading: loadingTerms } = useQuery({
    queryKey: ['terms', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
          const { data, error } = await supabase.from('terms').select('*').eq('user_id', session.user.id);
          if (error) throw error;
          return data.map(t => ({ ...t, is_finalised: !!t.closed })) as Term[];
      } catch (e) {
          console.error("AdminLess error: Failed to fetch terms", e);
          return [];
      }
    },
    enabled: !!session?.user?.id
  });
  
  const { activeYear, activeTerm, setActiveYear, setActiveTerm } = useAcademicSelection(years, allTerms);

  const terms = useMemo(() => {
    if (!session?.user?.id) return [];
    const list = diagnosticMode ? allTerms : (activeYear ? allTerms.filter(t => t.year_id === activeYear.id) : []);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [allTerms, activeYear?.id, diagnosticMode, session?.user?.id]);

  const { data: assessments = [], isLoading: loadingAss } = useQuery({
    queryKey: ['assessments', session?.user?.id, currentClassFilter?.classId, currentClassFilter?.termId, activeTerm?.id, diagnosticMode],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
          // Join assessment_questions to ensure UI doesn't fail silently
          const selectStr = '*, assessment_questions(*)';
          
          if (diagnosticMode) {
              const { data, error } = await supabase.from('assessments').select(selectStr).eq('user_id', session.user.id);
              if (error) throw error;
              return (data || []).map(a => ({ ...a, questions: a.assessment_questions }));
          }
          const termId = currentClassFilter?.termId || activeTerm?.id;
          if (!currentClassFilter?.classId || !termId) return [];
          
          const { data, error } = await supabase.from('assessments')
            .select(selectStr)
            .eq('class_id', currentClassFilter.classId)
            .eq('term_id', termId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          return (data || []).map(a => ({ ...a, questions: a.assessment_questions }));
      } catch (e) {
          console.error("AdminLess error: Failed to fetch assessments", e);
          return [];
      }
    },
    enabled: !!session?.user?.id && (diagnosticMode || (!!currentClassFilter?.classId && !!(currentClassFilter?.termId || activeTerm?.id)))
  });

  const { data: marks = [] } = useQuery({
    queryKey: ['assessment_marks', session?.user?.id, assessments.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      if (!session?.user?.id || assessments.length === 0) return [];
      try {
          const assIds = assessments.map((a: any) => a.id);
          const { data, error } = await supabase.from('assessment_marks')
            .select('*')
            .in('assessment_id', assIds)
            .eq('user_id', session.user.id);
          if (error) throw error;
          return data || [];
      } catch (e) {
          console.error("AdminLess error: Failed to fetch marks", e);
          return [];
      }
    },
    enabled: !!session?.user?.id && assessments.length > 0
  });

  const { updateLearnerActiveAverages, recalculateAllActiveAverages, runDataVacuum } = useAcademicAverages();
  
  const logInternalActivity = useCallback(async (message: string, yearId?: string, termId?: string) => {
    if (!session?.user?.id) return;
    try {
        const targetYearId = yearId || activeYear?.id;
        const targetTermId = termId || activeTerm?.id;
        if (!targetYearId || !targetTermId) return;
        
        const { error } = await supabase.from('activities').upsert({
          id: crypto.randomUUID(),
          user_id: session.user.id,
          year_id: targetYearId,
          term_id: targetTermId,
          message,
          timestamp: new Date().toISOString(),
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch (e) {
        console.error("AdminLess error: Failed to log activity", e);
    }
  }, [session?.user?.id, activeYear?.id, activeTerm?.id, queryClient]);

  const { rollForwardClasses: doRollForward } = useAcademicMigration(session?.user?.id, logInternalActivity);

  const createYear = useCallback(async (name: string) => {
    if (!session?.user?.id) return;
    try {
        const yearId = crypto.randomUUID();
        const { error: yearError } = await supabase.from('academic_years').upsert({ id: yearId, name, user_id: session.user.id, closed: false });
        if (yearError) throw yearError;

        const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((tName) => ({
          id: crypto.randomUUID(), year_id: yearId, name: tName, user_id: session.user.id, closed: false, weight: 25, 
        }));
        const { error: termError } = await supabase.from('terms').upsert(termsToCreate);
        if (termError) throw termError;

        await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
    } catch (e) {
        console.error("AdminLess error: Failed to create year", e);
        showError("Failed to initialize academic year.");
    }
  }, [session?.user?.id, queryClient]);

  const deleteYear = useCallback(async (id: string) => {
    try {
        const { error: tErr } = await supabase.from('terms').delete().eq('year_id', id);
        if (tErr) throw tErr;
        const { error: yErr } = await supabase.from('academic_years').delete().eq('id', id);
        if (yErr) throw yErr;

        await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
        showSuccess("Academic year deleted.");
    } catch (e) {
        console.error("AdminLess error: Failed to delete year", e);
        showError("Failed to delete academic year. Make sure it is empty.");
    }
  }, [queryClient]);

  const updateTerm = useCallback(async (term: Term) => {
    try {
        const payload = { ...term };
        delete (payload as any).is_finalised;
        const { error } = await supabase.from('terms').upsert(payload);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
    } catch (e) {
        console.error("AdminLess error: Failed to update term", e);
        showError("Failed to update term settings.");
    }
  }, [queryClient]);

  const createAssessment = useCallback(async (assessment: Omit<Assessment, 'id'>) => {
    if (!session?.user?.id || !activeYear) {
      showError("Session context lost. Please refresh.");
      return;
    }

    console.log("[AcademicContext] Initializing FAT creation:", assessment.title);

    try {
        const id = crypto.randomUUID();
        const { questions, ...headerData } = assessment;
        
        // Prepare main assessment record
        const payload = { 
            ...headerData, 
            id, 
            user_id: session.user.id,
            academic_year_id: activeYear.id // Critical for year-based scoping
        };

        // 1. Insert the header
        const { error: headerError } = await supabase.from('assessments').insert(payload);
        if (headerError) {
          console.error("[AcademicContext] FAT Header Error:", headerError);
          throw new Error("Unable to save assessment header.");
        }

        // 2. Insert questions if present
        if (questions && questions.length > 0) {
            const questionPayloads = questions.map(q => ({
                assessment_id: id,
                question_number: q.question_number,
                skill_description: q.skill_description,
                topic: q.topic,
                cognitive_level: q.cognitive_level,
                max_mark: q.max_mark
            }));

            const { error: qError } = await supabase.from('assessment_questions').insert(questionPayloads);
            if (qError) {
                console.error("[AcademicContext] FAT Questions Error:", qError);
                // We keep the header since it was successful, but warn the user
                showError("Assessment created but question details failed to save.");
            }
        }

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        showSuccess(`Assessment "${assessment.title}" recorded.`);
        return id;
    } catch (e: any) {
        console.error("AdminLess error: Critical FAT Save Failure:", e);
        showError(e.message || "Failed to record assessment.");
    }
  }, [session?.user?.id, activeYear, queryClient]);

  const updateAssessment = useCallback(async (a: Assessment) => {
    try {
        const { questions, ...headerData } = a;
        
        // 1. Update header
        const { error: headerError } = await supabase.from('assessments').upsert({
            ...headerData,
            user_id: session?.user?.id
        });
        if (headerError) throw headerError;

        // 2. Refresh questions (Delete and Re-insert for simplicity in AdminLess logic)
        if (questions) {
            await supabase.from('assessment_questions').delete().eq('assessment_id', a.id);
            if (questions.length > 0) {
                const questionPayloads = questions.map(q => ({
                    assessment_id: a.id,
                    question_number: q.question_number,
                    skill_description: q.skill_description,
                    topic: q.topic,
                    cognitive_level: q.cognitive_level,
                    max_mark: q.max_mark
                }));
                await supabase.from('assessment_questions').insert(questionPayloads);
            }
        }

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        showSuccess("Assessment settings updated.");
    } catch (e) {
        console.error("AdminLess error: Failed to update assessment", e);
        showError("Failed to update assessment.");
    }
  }, [session?.user?.id, queryClient]);

  const deleteAssessment = useCallback(async (id: string) => {
    if (!confirm("Delete this assessment? This will permanently remove all marks and question data.")) return;

    try {
        // Cascade handles questions and marks if FK is set, but we do it manually to be safe
        await supabase.from('assessment_marks').delete().eq('assessment_id', id); 
        await supabase.from('assessment_questions').delete().eq('assessment_id', id);
        const { error: aErr } = await supabase.from('assessments').delete().eq('id', id);
        if (aErr) throw aErr;

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
        showSuccess("Assessment deleted.");
    } catch (e) {
        console.error("AdminLess error: Failed to delete assessment", e);
        showError("Failed to delete assessment.");
    }
  }, [queryClient]);

  const updateMarks = useCallback(async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user?.id || updates.length === 0) return;
    try {
        const toUpsert = await Promise.all(updates.map(async (u) => {
            const { data: existing } = await supabase.from('assessment_marks').select('id').eq('assessment_id', u.assessment_id).eq('learner_id', u.learner_id).single();
            const cleaned = { ...u, id: existing?.id || crypto.randomUUID(), user_id: session.user.id };
            delete cleaned.question_marks;
            delete cleaned.rubric_selections;
            return cleaned as AssessmentMark;
        }));

        const { error } = await supabase.from('assessment_marks').upsert(toUpsert);
        if (error) throw error;

        await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
        updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
    } catch (e) {
        console.error("AdminLess error: Failed to update marks", e);
        showError("Failed to update marks. Please check your connection.");
    }
  }, [session?.user?.id, updateLearnerActiveAverages, queryClient]);

  const refreshAssessments = useCallback(async (c: string, t?: string) => {
    const targetTermId = t || activeTerm?.id || '';
    if (targetTermId) {
        setCurrentClassFilter({ classId: c, termId: targetTermId });
    }
  }, [activeTerm?.id]);

  const toggleTermStatus = useCallback(async (termId: string, finalised: boolean) => {
    try {
        const { error } = await supabase.from('terms').update({ closed: finalised }).eq('id', termId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
    } catch (e) {
        console.error("AdminLess error: Failed to toggle term status", e);
        showError("Failed to update term status.");
    }
  }, [queryClient]);

  const closeYear = useCallback(async (id: string) => {
    try {
        const { error } = await supabase.from('academic_years').update({ closed: true }).eq('id', id);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    } catch (e) {
        console.error("AdminLess error: Failed to close year", e);
        showError("Failed to finalise academic year.");
    }
  }, [queryClient]);

  const rollForwardClasses = useCallback(async (s: string, t: string, d: any[]) => {
      try {
          await doRollForward(activeYear?.id || '', s, t, d, setActiveTerm);
      } catch (e) {
          console.error("AdminLess error: Roll forward failed", e);
          showError("Failed to roll forward classes.");
      }
  }, [doRollForward, activeYear?.id, setActiveTerm]);

  const value = useMemo(() => ({
    years, terms, assessments, marks, 
    loading: loadingYears || loadingTerms || loadingAss, 
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
    runDataVacuum, rollForwardClasses, diagnosticMode, loadingYears, loadingTerms, loadingAss
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