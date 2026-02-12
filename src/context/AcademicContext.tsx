"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark, Activity } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademicSelection } from '@/hooks/useAcademicSelection';
import { useAcademicMigration } from '@/hooks/useAcademicMigration';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';

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
  toggleTermStatus: (termId: string, closed: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
  recalculateAllActiveAverages: () => Promise<void>;
  rollForwardClasses: (sourceTermId: string, targetTermId: string, preparedClasses: any[]) => Promise<void>;
  migrateLegacyData: (yearId: string, termId: string) => Promise<MigrationReport>;
  diagnosticMode: boolean;
  setDiagnosticMode: (active: boolean) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [currentClassFilter, setCurrentClassFilter] = useState<{classId: string, termId: string} | null>(null);

  // 1. Data Fetching
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  const allTerms = useLiveQuery(() => db.terms.toArray()) || [];
  
  const { activeYear, activeTerm, setActiveYear, setActiveTerm } = useAcademicSelection(years, allTerms);

  // Define terms for the context value, applying filters based on active selection
  const terms = useMemo(() => {
    if (diagnosticMode) return allTerms;
    if (!activeYear) return [];
    return allTerms.filter(t => t.year_id === activeYear.id);
  }, [allTerms, activeYear?.id, diagnosticMode]);

  const assessments = useLiveQuery(async () => {
      if (diagnosticMode) return db.assessments.toArray();
      if (!currentClassFilter) return [];
      return db.assessments.where('[class_id+term_id]').equals([currentClassFilter.classId, currentClassFilter.termId]).toArray();
  }, [currentClassFilter, diagnosticMode]) || [];

  const marks = useLiveQuery(async () => {
      if (diagnosticMode) return db.assessment_marks.toArray();
      if (assessments.length === 0) return [];
      return db.assessment_marks.where('assessment_id').anyOf(assessments.map(a => a.id)).toArray();
  }, [assessments, diagnosticMode]) || [];

  // 2. Specialized Hooks
  const { updateLearnerActiveAverages, recalculateAllActiveAverages } = useAcademicAverages();
  
  const logInternalActivity = useCallback(async (message: string, yearId?: string, termId?: string) => {
    if (!session?.user.id) return;
    const targetYearId = yearId || activeYear?.id;
    const targetTermId = termId || activeTerm?.id;
    if (!targetYearId || !targetTermId) return;

    const newActivity: Activity = {
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

  const { migrateLegacyData, rollForwardClasses: doRollForward } = useAcademicMigration(
    session?.user.id, 
    recalculateAllActiveAverages, 
    logInternalActivity
  );

  // 3. API Implementations
  const createYear = async (name: string) => {
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
      closed: idx !== 0,
      weight: 25,
      start_date: null,
      end_date: null
    }));

    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'create', termsToCreate);
    
    logInternalActivity(`Created academic cycle: "${name}"`, yearId, termsToCreate[0].id);
    showSuccess(`Academic Year ${name} created.`);
  };

  const deleteYear = async (yearId: string) => {
    const year = await db.academic_years.get(yearId);
    if (!year) return;
    const yearTerms = await db.terms.where('year_id').equals(yearId).toArray();
    if (yearTerms.some(t => t.closed)) return showError("Blocked: Finalized terms exist.");

    await db.transaction('rw', [db.academic_years, db.terms, db.sync_queue], async () => {
        await db.terms.where('year_id').equals(yearId).delete();
        await db.academic_years.delete(yearId);
        for (const t of yearTerms) await queueAction('terms', 'delete', { id: t.id });
        await queueAction('academic_years', 'delete', { id: yearId });
    });

    logInternalActivity(`Deleted academic cycle: "${year.name}"`, yearId, yearTerms[0]?.id);
    showSuccess(`Academic Year "${year.name}" deleted.`);
  };

  const updateTerm = async (term: Term) => {
    const year = await db.academic_years.get(term.year_id);
    if (year?.closed) return showError("Year is finalized.");
    await db.terms.put(term);
    await queueAction('terms', 'update', term);
    recalculateAllActiveAverages();
    showSuccess('Term updated.');
  };

  const toggleTermStatus = async (termId: string, closed: boolean) => {
      const term = await db.terms.get(termId);
      if (!term) return;
      await db.terms.update(termId, { closed });
      await queueAction('terms', 'update', { id: termId, closed });
      if (!closed) setActiveTerm(term);
      logInternalActivity(`${closed ? 'Finalized' : 'Re-opened'} term: "${term.name}"`, term.year_id, term.id);
      showSuccess(`Term ${closed ? 'finalized' : 'activated'}.`);
  };

  const rollForwardClasses = (sourceId: string, targetId: string, data: any[]) => 
    doRollForward(activeYear?.id || '', sourceId, targetId, data, setActiveTerm);

  const closeYear = async (yearId: string) => {
    await db.academic_years.update(yearId, { closed: true });
    await queueAction('academic_years', 'update', { id: yearId, closed: true });
    showSuccess("Academic Year permanently finalized.");
  };

  const createAssessment = async (assessment: Omit<Assessment, 'id'>): Promise<string> => {
    const id = crypto.randomUUID();
    if (!session?.user.id) return id; 
    const data = { ...assessment, id, user_id: session.user.id };
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    return id;
  };

  const updateAssessment = async (assessment: Assessment) => {
    if (!session?.user.id) return;
    await db.assessments.put(assessment);
    await queueAction('assessments', 'update', assessment);
    showSuccess("Assessment updated.");
  };

  const deleteAssessment = async (id: string) => {
      await db.assessment_marks.where('assessment_id').equals(id).delete(); 
      await db.assessments.delete(id);
      await queueAction('assessments', 'delete', { id });
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user.id || updates.length === 0) return;
    const toUpsert = await Promise.all(updates.map(async (u) => {
        const existing = await db.assessment_marks.where('[assessment_id+learner_id]').equals([u.assessment_id, u.learner_id]).first();
        return { ...u, id: existing?.id || crypto.randomUUID(), user_id: session.user.id } as AssessmentMark;
    }));
    await db.assessment_marks.bulkPut(toUpsert);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    await updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
  };

  return (
    <AcademicContext.Provider value={{
      years, 
      terms, 
      assessments, 
      marks, 
      loading: !years, 
      activeYear, 
      activeTerm,
      setActiveYear, 
      setActiveTerm, 
      createYear, 
      deleteYear, 
      updateTerm,
      createAssessment, 
      updateAssessment, 
      deleteAssessment, 
      updateMarks, 
      refreshAssessments: async (c, t) => setCurrentClassFilter({ classId: c, termId: t || activeTerm?.id || '' }),
      toggleTermStatus, 
      closeYear, 
      recalculateAllActiveAverages, 
      rollForwardClasses, 
      migrateLegacyData,
      diagnosticMode, 
      setDiagnosticMode
    }}>
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) throw new Error('useAcademic must be used within an AcademicProvider');
  return context;
};