import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';

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
  updateTerm: (term: Term) => Promise<void>;
  createAssessment: (assessment: Omit<Assessment, 'id'>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  updateMarks: (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => Promise<void>;
  refreshAssessments: (classId: string, termId?: string) => Promise<void>;
  toggleTermStatus: (termId: string, closed: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  
  // Live Queries
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  
  // Derived state for active year
  const activeYear = years.find(y => y.id === activeYearId) || years.find(y => !y.closed) || years[0] || null;

  const terms = useLiveQuery(async () => {
      if (!activeYear) return [];
      return db.terms.where('year_id').equals(activeYear.id).sortBy('name');
  }, [activeYear?.id]) || [];

  // Derived state for active term
  useEffect(() => {
      if (terms.length > 0 && !activeTermId) {
          const now = new Date().toISOString();
          const current = terms.find(t => t.start_date && t.end_date && now >= t.start_date && now <= t.end_date) || terms[0];
          setActiveTermId(current.id);
      }
  }, [terms, activeTermId]);

  const activeTerm = terms.find(t => t.id === activeTermId) || null;

  // Assessments state (still filtered manually for UI performance)
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

  const createYear = async (name: string) => {
    if (!session?.user.id) return;
    const yearId = crypto.randomUUID();
    
    const yearData = { id: yearId, name, user_id: session.user.id, closed: false };
    await db.academic_years.add(yearData);
    await queueAction('academic_years', 'insert', yearData);

    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map(tName => ({
      id: crypto.randomUUID(),
      year_id: yearId,
      name: tName,
      user_id: session.user.id,
      closed: false,
      weight: 25
    }));

    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'insert', termsToCreate);
    
    showSuccess(`Academic Year ${name} created.`);
  };

  const updateTerm = async (term: Term) => {
     await db.terms.put(term);
     await queueAction('terms', 'update', term);
     showSuccess('Term updated.');
  };
  
  const toggleTermStatus = async (termId: string, closed: boolean) => {
      await db.terms.update(termId, { closed });
      await queueAction('terms', 'update', { id: termId, closed });
      showSuccess(`Term ${closed ? 'closed' : 're-opened'}.`);
  };

  const closeYear = async (yearId: string) => {
    const openTerms = await db.terms.where('year_id').equals(yearId).filter(t => !t.closed).count();
    
    if (openTerms > 0) {
        showError(`Cannot close year. ${openTerms} terms are still open.`);
        return;
    }

    await db.academic_years.update(yearId, { closed: true });
    await queueAction('academic_years', 'update', { id: yearId, closed: true });
    showSuccess("Academic Year finalized and closed.");
  };

  const refreshAssessments = async (classId: string, termId?: string) => {
    const targetTermId = termId || activeTerm?.id;
    if (!targetTermId) return;
    setCurrentClassFilter({ classId, termId: targetTermId });
  };

  const createAssessment = async (assessment: Omit<Assessment, 'id'>) => {
    if (!session?.user.id) return;
    const id = crypto.randomUUID();
    const data = { ...assessment, id, user_id: session.user.id };
    
    await db.assessments.add(data);
    await queueAction('assessments', 'insert', data);
    showSuccess("Assessment created.");
  };

  const deleteAssessment = async (id: string) => {
      await db.assessment_marks.where('assessment_id').equals(id).delete(); // Manual cascade
      await db.assessments.delete(id);
      await queueAction('assessments', 'delete', { id });
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => {
    if (!session?.user.id) return;
    
    // We must fetch existing marks to preserve IDs if we want strict updating, or rely on composite key upsert
    // Dexie put() handles upsert by key. `assessment_marks` has composite key [assessment_id+learner_id] defined in schema?
    // In db.ts I defined: assessment_marks: '[assessment_id+learner_id], assessment_id, learner_id'
    // So `put` works fine.
    
    const toUpsert = updates.map(u => ({
        ...u,
        user_id: session.user.id
    }));

    // For sync queue, we need to know if it's insert or update? 
    // Supabase upsert handles both.
    
    await db.assessment_marks.bulkPut(toUpsert as any);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    
    showSuccess("Saved successfully.");
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
      setActiveYear: (y) => setActiveYearId(y?.id || null),
      setActiveTerm: (t) => setActiveTermId(t?.id || null),
      createYear,
      updateTerm,
      createAssessment,
      deleteAssessment,
      updateMarks,
      refreshAssessments,
      toggleTermStatus,
      closeYear
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