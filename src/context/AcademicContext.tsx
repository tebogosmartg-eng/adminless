import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { useActivity } from './ActivityContext';

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
  deleteAssessment: (id: string) => Promise<void>;
  updateMarks: (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => Promise<void>;
  refreshAssessments: (classId: string, termId?: string) => Promise<void>;
  toggleTermStatus: (termId: string, closed: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
  recalculateAllActiveAverages: () => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

const STORAGE_KEYS = {
  YEAR: 'adminless_active_year_id',
  TERM: 'adminless_active_term_id'
};

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  
  const [activeYearId, setActiveYearIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.YEAR));
  const [activeTermId, setActiveTermIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.TERM));
  
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  
  const activeYear = useMemo(() => {
    if (!years.length || !activeYearId) return null;
    return years.find(y => y.id === activeYearId) || null;
  }, [years, activeYearId]);

  const terms = useLiveQuery(async () => {
      if (!activeYear) return [];
      return db.terms.where('year_id').equals(activeYear.id).sortBy('name');
  }, [activeYear?.id]) || [];

  const activeTerm = useMemo(() => {
    if (!terms.length || !activeTermId) return null;
    return terms.find(t => t.id === activeTermId) || null;
  }, [terms, activeTermId]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    if (!id) {
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
    }
  };

  const setActiveTerm = (term: Term | null) => {
    const id = term?.id || null;
    setActiveTermIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.TERM, id);
    else localStorage.removeItem(STORAGE_KEYS.TERM);
  };

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

  const updateLearnerActiveAverages = useCallback(async (learnerIds: string[]) => {
    const currentOpenTerm = terms.find(t => !t.closed);
    if (!currentOpenTerm || learnerIds.length === 0) return;

    for (const learnerId of learnerIds) {
        const learner = await db.learners.get(learnerId);
        if (!learner) continue;

        const termAssessments = await db.assessments
            .where('[class_id+term_id]')
            .equals([learner.class_id, currentOpenTerm.id])
            .toArray();
        
        if (termAssessments.length === 0) {
            await db.learners.update(learnerId, { mark: "" });
            continue;
        }

        const assessmentIds = termAssessments.map(a => a.id);
        const learnerMarks = await db.assessment_marks
            .where('assessment_id')
            .anyOf(assessmentIds)
            .and(m => m.learner_id === learnerId)
            .toArray();

        const avg = calculateWeightedAverage(termAssessments, learnerMarks, learnerId);
        const newAverage = formatDisplayMark(avg);

        await db.learners.update(learnerId, { mark: newAverage });
        await queueAction('learners', 'update', { id: learnerId, mark: newAverage });
    }
  }, [terms]);

  const recalculateAllActiveAverages = async () => {
      const openTerm = terms.find(t => !t.closed);
      if (!openTerm) {
          showError("No active term found to recalculate.");
          return;
      }

      const allLearners = await db.learners.toArray();
      const ids = allLearners.map(l => l.id!);
      
      await db.transaction('rw', [db.learners, db.sync_queue], async () => {
          await updateLearnerActiveAverages(ids);
      });

      showSuccess("Global data audit and average repair complete.");
  };

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
      weight: 25
    }));

    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'create', termsToCreate);
    
    logActivity(`Created academic cycle: "${name}"`);
    showSuccess(`Academic Year ${name} created with 4 standard terms.`);
  };

  const deleteYear = async (yearId: string) => {
    try {
      const year = await db.academic_years.get(yearId);
      if (!year) return;

      // 1. Check for finalized terms
      const yearTerms = await db.terms.where('year_id').equals(yearId).toArray();
      if (yearTerms.some(t => t.closed)) {
        showError("Blocked: This year contains finalized terms. Re-open them first if you wish to delete.");
        return;
      }

      const termIds = yearTerms.map(t => t.id);

      // 2. Check for assessments
      const yearAssessments = await db.assessments.where('term_id').anyOf(termIds).toArray();
      if (yearAssessments.length > 0) {
        showError(`Blocked: This year contains ${yearAssessments.length} assessments. Delete them individually first.`);
        return;
      }

      // 3. Check for evidence (reports/audit trail)
      const yearEvidence = await db.evidence.where('term_id').anyOf(termIds).toArray();
      if (yearEvidence.length > 0) {
        showError("Blocked: This year has audit evidence (scripts/moderation notes) attached.");
        return;
      }

      // 4. Check for marks (redundant if assessments are checked, but good for integrity)
      const assessmentIds = yearAssessments.map(a => a.id);
      const yearMarks = await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray();
      if (yearMarks.length > 0) {
        showError("Blocked: Assessment marks exist for this year.");
        return;
      }

      // If all clean, delete terms and year
      await db.transaction('rw', [db.academic_years, db.terms, db.sync_queue], async () => {
        await db.terms.where('year_id').equals(yearId).delete();
        await db.academic_years.delete(yearId);
        
        // Queue sync for terms
        for (const termId of termIds) {
          await queueAction('terms', 'delete', { id: termId });
        }
        // Queue sync for year
        await queueAction('academic_years', 'delete', { id: yearId });
      });

      if (activeYearId === yearId) {
        setActiveYear(null);
      }

      logActivity(`Deleted academic cycle: "${year.name}"`);
      showSuccess(`Academic Year "${year.name}" deleted.`);
    } catch (e) {
      console.error(e);
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
     
     if (oldTerm?.weight !== term.weight) {
         recalculateAllActiveAverages();
     }
     
     logActivity(`Updated configuration for: "${term.name}" (${year?.name})`);
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
      
      if (!closed) {
          setActiveTerm(term);
      }
      
      logActivity(`${closed ? 'Finalized' : 'Re-opened'} academic term: "${term.name}"`);
      showSuccess(`Term ${closed ? 'finalized' : 'activated'}.`);
  };

  const closeYear = async (yearId: string) => {
    const year = await db.academic_years.get(yearId);
    const yearTerms = await db.terms.where('year_id').equals(yearId).toArray();
    const openTerms = yearTerms.filter(t => !t.closed);
    
    if (openTerms.length > 0) {
        showError(`Finalize all terms before closing the academic year.`);
        return;
    }
    await db.academic_years.update(yearId, { closed: true });
    await queueAction('academic_years', 'update', { id: yearId, closed: true });
    
    logActivity(`Permanently finalized academic year: "${year?.name}"`);
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
    
    // CRITICAL: Prevent assessment creation in unintended terms or finalized cycles
    const term = await db.terms.get(assessment.term_id);
    if (!term) {
        throw new Error("Invalid academic term referenced.");
    }
    
    if (term.closed) {
        throw new Error("Cannot add assessments to a finalized term.");
    }

    const year = await db.academic_years.get(term.year_id);
    if (year?.closed) {
        throw new Error("Cannot modify assessments in a finalized academic year.");
    }

    const data = { ...assessment, id, user_id: session.user.id };
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    
    const classInfo = await db.classes.get(assessment.class_id);
    logActivity(`Created assessment: "${assessment.title}" for class: "${classInfo?.className}" in ${term.name}`);
    
    showSuccess("Assessment created.");
    return id;
  };

  const deleteAssessment = async (id: string) => {
      const ass = await db.assessments.get(id);
      if (!ass) return;

      const term = await db.terms.get(ass.term_id);
      if (term?.closed) {
          showError("Cannot delete assessments from a finalized term.");
          return;
      }

      const marksToDelete = await db.assessment_marks.where('assessment_id').equals(id).toArray();
      const affectedLearnerIds = Array.from(new Set(marksToDelete.map(m => m.learner_id)));

      await db.assessment_marks.where('assessment_id').equals(id).delete(); 
      await db.assessments.delete(id);
      await queueAction('assessments', 'delete', { id });

      await updateLearnerActiveAverages(affectedLearnerIds);
      
      logActivity(`Deleted assessment: "${ass.title}" and ${marksToDelete.length} associated marks.`);
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user.id || updates.length === 0) return;
    
    // CRITICAL: Integrity check for term context
    const assIds = [...new Set(updates.map(u => u.assessment_id))];
    const targetAssessments = await db.assessments.where('id').anyOf(assIds).toArray();
    
    if (targetAssessments.length === 0) {
        throw new Error("Integrity Failure: Assessment metadata not found for mark updates.");
    }

    const termIds = [...new Set(targetAssessments.map(a => a.term_id))];
    const targetTerms = await db.terms.where('id').anyOf(termIds).toArray();

    if (targetTerms.some(t => t.closed)) {
        showError("Restricted: One or more records belong to a finalized term.");
        return;
    }

    const toUpsert = updates.map(u => ({
        ...u,
        user_id: session.user.id
    }));

    await db.assessment_marks.bulkPut(toUpsert as any);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    
    const learnerIds = Array.from(new Set(updates.map(u => u.learner_id)));
    await updateLearnerActiveAverages(learnerIds);
    
    const firstAss = targetAssessments[0];
    const classInfo = await db.classes.get(firstAss.class_id);
    logActivity(`Updated marks in "${firstAss.title}" (${classInfo?.className})`);
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
      deleteAssessment,
      updateMarks,
      refreshAssessments,
      toggleTermStatus,
      closeYear,
      recalculateAllActiveAverages
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