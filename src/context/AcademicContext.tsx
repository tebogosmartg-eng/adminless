"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark, Activity } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademicSelection } from '@/hooks/useAcademicSelection';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';
import { useAcademicMigration } from '@/hooks/useAcademicMigration';

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
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  // 1. Data Subscriptions
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  
  const activeYearId = useMemo(() => localStorage.getItem('adminless_active_year_id'), []);
  const terms = useLiveQuery(async () => {
      const yearId = localStorage.getItem('adminless_active_year_id');
      if (!yearId) return [];
      return db.terms.where('year_id').equals(yearId).sortBy('name');
  }, [activeYearId]) || [];

  const [currentClassFilter, setCurrentClassFilter] = useState<{classId: string, termId: string} | null>(null);
  
  const assessments = useLiveQuery(async () => {
      if (!currentClassFilter) return [];
      return db.assessments
        .where('[class_id+term_id]')
        .equals([currentClassFilter.classId, currentClassFilter.termId])
        .toArray();
  }, [currentClassFilter]) || [];

  const marks = useLiveQuery(async () => {
      if (assessments.length === 0) return [];
      const ids = assessments.map(a => a.id);
      return db.assessment_marks.where('assessment_id').anyOf(ids).toArray();
  }, [assessments]) || [];

  // 2. Logic Hooks
  const { activeYear, activeTerm, setActiveYear, setActiveTerm } = useAcademicSelection(years, terms);
  const { recalculateAllActiveAverages, updateLearnerActiveAverages } = useAcademicAverages();
  
  const logInternalActivity = useCallback(async (message: string, yearId?: string, termId?: string) => {
    const userId = session?.user.id;
    const targetYearId = yearId || activeYear?.id;
    const targetTermId = termId || activeTerm?.id;
    
    if (!userId || !targetYearId || !targetTermId) return;

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      user_id: userId,
      year_id: targetYearId,
      term_id: targetTermId,
      message,
      timestamp: new Date().toISOString(),
    };

    await db.activities.add(newActivity);
    await queueAction('activities', 'create', newActivity);
  }, [session?.user.id, activeYear?.id, activeTerm?.id]);

  const { migrateLegacyData, rollForwardClasses: rollForwardLogic } = useAcademicMigration(
    session?.user.id,
    recalculateAllActiveAverages,
    logInternalActivity
  );

  // 3. Actions
  const createYear = async (name: string) => {
    if (!session?.user.id) return;
    const yearId = crypto.randomUUID();
    const yearData = { id: yearId, name, user_id: session.user.id, closed: false };
    await db.academic_years.add(yearData);
    await queueAction('academic_years', 'create', yearData);

    const firstTermId = crypto.randomUUID();
    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((tName, idx) => ({
      id: idx === 0 ? firstTermId : crypto.randomUUID(),
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
    
    await logInternalActivity(`Created academic cycle: "${name}"`, yearId, firstTermId);
    showSuccess(`Academic Year ${name} created with 4 standard terms.`);
  };

  const deleteYear = async (yearId: string) => {
    try {
      const year = await db.academic_years.get(yearId);
      if (!year) return;

      const yearTerms = await db.terms.where('year_id').equals(yearId).toArray();
      if (yearTerms.some(t => t.closed)) {
        showError("Blocked: This year contains finalized terms.");
        return;
      }

      const termIds = yearTerms.map(t => t.id);
      const yearAssessments = await db.assessments.where('term_id').anyOf(termIds).toArray();
      if (yearAssessments.length > 0) {
        showError(`Blocked: Delete ${yearAssessments.length} assessments first.`);
        return;
      }

      await db.transaction('rw', [db.academic_years, db.terms, db.sync_queue], async () => {
        await db.terms.where('year_id').equals(yearId).delete();
        await db.academic_years.delete(yearId);
        for (const termId of termIds) {
          await queueAction('terms', 'delete', { id: termId });
        }
        await queueAction('academic_years', 'delete', { id: yearId });
      });

      if (activeYear?.id === yearId) setActiveYear(null);
      await logInternalActivity(`Deleted academic cycle: "${year.name}"`, yearId, termIds[0]);
      showSuccess(`Academic Year "${year.name}" deleted.`);
    } catch (e) {
      showError("Failed to delete academic year.");
    }
  };

  const updateTerm = async (term: Term) => {
     const year = await db.academic_years.get(term.year_id);
     if (year?.closed) {
         showError("Cannot modify terms in a finalized year.");
         return;
     }
     const oldTerm = await db.terms.get(term.id);
     await db.terms.put(term);
     await queueAction('terms', 'update', term);
     if (oldTerm?.weight !== term.weight) await recalculateAllActiveAverages();
     
     await logInternalActivity(`Updated configuration for: "${term.name}"`, term.year_id, term.id);
     showSuccess('Term configuration updated.');
  };
  
  const toggleTermStatus = async (termId: string, closed: boolean) => {
      const term = await db.terms.get(termId);
      if (!term) return;
      const year = await db.academic_years.get(term.year_id);
      if (year?.closed && !closed) {
          showError("Cannot re-open terms in a finalized year.");
          return;
      }
      if (!closed) {
          const alreadyOpen = terms.find(t => !t.closed && t.id !== termId);
          if (alreadyOpen) {
              showError(`Cannot open ${term.name}. ${alreadyOpen.name} is still active.`);
              return;
          }
      }
      await db.terms.update(termId, { closed });
      await queueAction('terms', 'update', { id: termId, closed });
      if (!closed) setActiveTerm(term);
      
      await logInternalActivity(`${closed ? 'Finalized' : 'Re-opened'} academic term: "${term.name}"`, term.year_id, term.id);
      showSuccess(`Term ${closed ? 'finalized' : 'activated'}.`);
  };

  const rollForwardClasses = async (sourceTermId: string, targetTermId: string, preparedClasses: any[]) => {
      if (activeYear) {
          await rollForwardLogic(activeYear.id, sourceTermId, targetTermId, preparedClasses, setActiveTerm);
      }
  };

  const closeYear = async (yearId: string) => {
    const yearTerms = await db.terms.where('year_id').equals(yearId).toArray();
    if (yearTerms.some(t => !t.closed)) {
        showError(`Finalize all terms before closing the academic year.`);
        return;
    }
    await db.academic_years.update(yearId, { closed: true });
    await queueAction('academic_years', 'update', { id: yearId, closed: true });
    
    await logInternalActivity(`Permanently finalized academic year.`, yearId, yearTerms[yearTerms.length-1].id);
    showSuccess("Academic Year permanently finalized.");
  };

  const refreshAssessments = async (classId: string, termId?: string) => {
    const targetTermId = termId || activeTerm?.id;
    if (!targetTermId) return;
    setCurrentClassFilter({ classId, termId: targetTermId });
  };

  const createAssessment = async (assessment: Omit<Assessment, 'id'>): Promise<string> => {
    const id = crypto.randomUUID();
    if (!session?.user.id) return id; 
    const term = await db.terms.get(assessment.term_id);
    if (!term || term.closed) throw new Error("Target term is finalized or invalid.");
    const data = { ...assessment, id, user_id: session.user.id };
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    showSuccess("Assessment created.");
    return id;
  };

  const updateAssessment = async (assessment: Assessment) => {
    if (!session?.user.id) return;
    const term = await db.terms.get(assessment.term_id);
    if (!term || term.closed) throw new Error("Target term is finalized.");
    
    await db.assessments.put(assessment);
    await queueAction('assessments', 'update', assessment);
    
    if (activeYear) {
      await logInternalActivity(`Updated assessment settings: "${assessment.title}"`, activeYear.id, assessment.term_id);
    }
    showSuccess("Assessment updated.");
  };

  const deleteAssessment = async (id: string) => {
      const ass = await db.assessments.get(id);
      if (!ass) return;
      const term = await db.terms.get(ass.term_id);
      if (term?.closed) { showError("Cannot modify finalized terms."); return; }
      await db.assessment_marks.where('assessment_id').equals(id).delete(); 
      await db.assessments.delete(id);
      await queueAction('assessments', 'delete', { id });
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user.id || updates.length === 0) return;

    const assIds = [...new Set(updates.map(u => u.assessment_id))];
    const targetAssessments = await db.assessments.where('id').anyOf(assIds).toArray();
    const termIds = [...new Set(targetAssessments.map(a => a.term_id))];
    const targetTerms = await db.terms.where('id').anyOf(termIds).toArray();
    
    if (targetTerms.some(t => t.closed)) { 
        showError("Finalized terms are read-only."); 
        return; 
    }

    const toUpsert: AssessmentMark[] = [];
    
    for (const update of updates) {
        const existingMark = await db.assessment_marks
            .where('[assessment_id+learner_id]')
            .equals([update.assessment_id, update.learner_id])
            .first();
        
        toUpsert.push({
            ...update,
            id: existingMark?.id || update.id || crypto.randomUUID(),
            user_id: session.user.id
        } as AssessmentMark);
    }

    await db.assessment_marks.bulkPut(toUpsert);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    
    await updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
  };

  return (
    <AcademicContext.Provider value={{
      years, terms, assessments, marks, loading: !years, activeYear, activeTerm,
      setActiveYear, setActiveTerm, createYear, deleteYear, updateTerm,
      createAssessment, updateAssessment, deleteAssessment, updateMarks, refreshAssessments,
      toggleTermStatus, closeYear, recalculateAllActiveAverages, rollForwardClasses, migrateLegacyData
    }}>
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};