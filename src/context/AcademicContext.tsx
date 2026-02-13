"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademicSelection } from '@/hooks/useAcademicSelection';
import { useAcademicMigration } from '@/hooks/useAcademicMigration';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';
import { supabase } from '@/integrations/supabase/client';

interface MigrationReport {
    success: boolean;
    counts: { [table: string]: number };
    total: number;
}

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
  migrateLegacyData: (yearId: string, termId: string) => Promise<MigrationReport>;
  resetToTermOne: (yearId: string, termOneId: string) => Promise<MigrationReport>;
  diagnosticMode: boolean;
  setDiagnosticMode: (active: boolean) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [currentClassFilter, setCurrentClassFilter] = useState<{classId: string, termId: string} | null>(null);

  const years = useLiveQuery(
    () => session?.user.id 
      ? db.academic_years.where('user_id').equals(session.user.id).reverse().sortBy('name') 
      : [],
    [session?.user.id]
  ) || [];

  const allTerms = useLiveQuery(
    () => session?.user.id 
      ? db.terms.where('user_id').equals(session.user.id).toArray() 
      : [],
    [session?.user.id]
  ) || [];
  
  const { activeYear, activeTerm, setActiveYear, setActiveTerm } = useAcademicSelection(years, allTerms);

  const terms = useMemo(() => {
    if (diagnosticMode) return allTerms;
    if (!activeYear) return [];
    return allTerms.filter(t => t.year_id === activeYear.id);
  }, [allTerms, activeYear?.id, diagnosticMode]);

  const assessments = useLiveQuery(async () => {
      if (!session?.user.id) return [];
      if (diagnosticMode) return db.assessments.where('user_id').equals(session.user.id).toArray();
      if (!currentClassFilter || !activeYear) return [];
      return db.assessments
        .where('[class_id+term_id]')
        .equals([currentClassFilter.classId, currentClassFilter.termId])
        .and(a => a.user_id === session.user.id)
        .toArray();
  }, [currentClassFilter, diagnosticMode, session?.user.id, activeYear?.id]) || [];

  const marks = useLiveQuery(async () => {
      if (!session?.user.id) return [];
      if (diagnosticMode) return db.assessment_marks.where('user_id').equals(session.user.id).toArray();
      if (assessments.length === 0) return [];
      const assIds = assessments.map(a => a.id);
      return db.assessment_marks
        .where('assessment_id')
        .anyOf(assIds)
        .and(m => m.user_id === session.user.id)
        .toArray();
  }, [assessments, diagnosticMode, session?.user.id]) || [];

  const { updateLearnerActiveAverages, recalculateAllActiveAverages, runDataVacuum } = useAcademicAverages();
  
  const logInternalActivity = useCallback(async (message: string, yearId?: string, termId?: string) => {
    if (!session?.user.id) return;
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
    await db.activities.add(newActivity);
    await queueAction('activities', 'create', newActivity);
  }, [session?.user.id, activeYear?.id, activeTerm?.id]);

  const { migrateLegacyData, resetToTermOne, rollForwardClasses: doRollForward } = useAcademicMigration(
    session?.user.id, 
    recalculateAllActiveAverages, 
    logInternalActivity
  );

  const createYear = useCallback(async (name: string) => {
    if (!session?.user.id) return;
    const yearId = crypto.randomUUID();
    const yearData = { id: yearId, name, user_id: session.user.id, closed: false };
    await db.academic_years.add(yearData);
    await queueAction('academic_years', 'create', yearData);
    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((tName, idx) => ({
      id: crypto.randomUUID(), 
      year_id: yearId, 
      name: tName, 
      user_id: session.user.id, 
      closed: false,
      is_finalised: false,
      weight: 25, 
      start_date: null, 
      end_date: null
    }));
    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'create', termsToCreate);
    showSuccess(`Academic Year ${name} initialized.`);
  }, [session?.user.id]);

  const deleteYear = useCallback(async (id: string) => {
    const yearTerms = await db.terms.where('year_id').equals(id).toArray();
    await db.transaction('rw', [db.academic_years, db.terms, db.sync_queue], async () => {
        await db.terms.where('year_id').equals(id).delete();
        await db.academic_years.delete(id);
        for (const t of yearTerms) await queueAction('terms', 'delete', { id: t.id });
        await queueAction('academic_years', 'delete', { id });
    });
    showSuccess("Academic Year removed.");
  }, []);

  const updateTerm = useCallback(async (term: Term) => {
    await db.terms.put(term);
    await queueAction('terms', 'update', term);
    recalculateAllActiveAverages(true);
  }, [recalculateAllActiveAverages]);

  const createAssessment = useCallback(async (assessment: Omit<Assessment, 'id'>) => {
    const currentTerm = allTerms.find(t => t.id === assessment.term_id);
    if (currentTerm?.is_finalised) {
        showError("Action Blocked: Cannot add assessments to a finalised term.");
        throw new Error("Finalised term");
    }

    const id = crypto.randomUUID();
    const data = { ...assessment, id, user_id: session?.user.id || '' };
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    return id;
  }, [session?.user.id, allTerms]);

  const updateAssessment = useCallback(async (a: Assessment) => {
    const currentTerm = allTerms.find(t => t.id === a.term_id);
    if (currentTerm?.is_finalised) {
        showError("Action Blocked: Cannot modify assessments in a finalised term.");
        return;
    }
    await db.assessments.put(a);
    await queueAction('assessments', 'update', a);
  }, [allTerms]);

  const deleteAssessment = useCallback(async (id: string) => {
    const ass = await db.assessments.get(id);
    const currentTerm = allTerms.find(t => t.id === ass?.term_id);
    if (currentTerm?.is_finalised) {
        showError("Action Blocked: Cannot delete assessments in a finalised term.");
        return;
    }
    await db.assessment_marks.where('assessment_id').equals(id).delete(); 
    await db.assessments.delete(id);
    await queueAction('assessments', 'delete', { id });
  }, [allTerms]);

  const updateMarks = useCallback(async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user.id || updates.length === 0) return;
    
    // Check if any mark belongs to a finalised term
    const firstAss = await db.assessments.get(updates[0].assessment_id);
    const currentTerm = allTerms.find(t => t.id === firstAss?.term_id);
    if (currentTerm?.is_finalised) {
        showError("Action Blocked: Data in a finalised term is read-only.");
        return;
    }

    const toUpsert = await Promise.all(updates.map(async (u) => {
        const existing = await db.assessment_marks.where('[assessment_id+learner_id]').equals([u.assessment_id, u.learner_id]).first();
        return { ...u, id: existing?.id || crypto.randomUUID(), user_id: session.user.id } as AssessmentMark;
    }));
    await db.assessment_marks.bulkPut(toUpsert);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    await updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
  }, [session?.user.id, updateLearnerActiveAverages, allTerms]);

  const refreshAssessments = useCallback(async (c: string, t?: string) => {
    const targetTermId = t || activeTerm?.id || '';
    setCurrentClassFilter(prev => {
      if (prev?.classId === c && prev?.termId === targetTermId) return prev;
      return { classId: c, termId: targetTermId };
    });
  }, [activeTerm?.id]);

  const toggleTermStatus = useCallback(async (termId: string, finalised: boolean) => {
    // Update both closed (compatibility) and is_finalised (new logic)
    await db.terms.update(termId, { is_finalised: finalised, closed: finalised });
    await queueAction('terms', 'update', { id: termId, is_finalised: finalised, closed: finalised });
    
    if (finalised) {
        logInternalActivity(`Finalised term: ${allTerms.find(t => t.id === termId)?.name}`);
    }
    
    showSuccess(`Term ${finalised ? 'finalised and locked' : 're-activated'}.`);
  }, [allTerms, logInternalActivity]);

  const closeYear = useCallback(async (id: string) => {
    await db.academic_years.update(id, { closed: true });
    await queueAction('academic_years', 'update', { id, closed: true });
    showSuccess("Year cycle finalized.");
  }, []);

  const rollForwardClasses = useCallback((s: string, t: string, d: any[]) => 
    doRollForward(activeYear?.id || '', s, t, d, setActiveTerm), 
  [doRollForward, activeYear?.id, setActiveTerm]);

  const value = useMemo(() => ({
    years, terms, assessments, marks, 
    loading: !years || !session?.user.id, 
    activeYear, activeTerm, setActiveYear, setActiveTerm, 
    createYear, deleteYear, updateTerm,
    createAssessment, updateAssessment, deleteAssessment,
    updateMarks, refreshAssessments, toggleTermStatus, closeYear,
    recalculateAllActiveAverages, runDataVacuum, rollForwardClasses,
    migrateLegacyData, resetToTermOne, diagnosticMode, setDiagnosticMode
  }), [
    years, terms, assessments, marks, activeYear, activeTerm, 
    setActiveYear, setActiveTerm, createYear, deleteYear, updateTerm, 
    createAssessment, updateAssessment, deleteAssessment, updateMarks, 
    refreshAssessments, toggleTermStatus, closeYear, recalculateAllActiveAverages, 
    runDataVacuum, rollForwardClasses, migrateLegacyData, resetToTermOne, diagnosticMode, session?.user.id
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