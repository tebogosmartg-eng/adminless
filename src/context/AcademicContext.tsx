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
  createAssessment: (assessment: Omit<Assessment, 'id'>) => Promise<string>;
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
  
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  
  // Logic to determine active year: Manual selection -> First Open Year -> First Year -> Null
  const activeYear = years.find(y => y.id === activeYearId) || years.find(y => !y.closed) || years[0] || null;

  const terms = useLiveQuery(async () => {
      if (!activeYear) return [];
      return db.terms.where('year_id').equals(activeYear.id).sortBy('name');
  }, [activeYear?.id]) || [];

  // Logic to determine active term
  useEffect(() => {
      if (terms.length === 0) return;

      // Check if current selection is valid for this list
      const isValidSelection = activeTermId && terms.some(t => t.id === activeTermId);

      if (!isValidSelection) {
          const now = new Date().toISOString();
          // Find term containing 'now'
          const current = terms.find(t => t.start_date && t.end_date && now >= t.start_date && now <= t.end_date);
          // Fallback to first term if no date match
          setActiveTermId(current?.id || terms[0].id);
      }
  }, [terms, activeTermId]);

  const activeTerm = terms.find(t => t.id === activeTermId) || null;

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
    await queueAction('academic_years', 'create', yearData);

    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map(tName => ({
      id: crypto.randomUUID(),
      year_id: yearId,
      name: tName,
      user_id: session.user.id,
      closed: false,
      weight: 25
    }));

    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'create', termsToCreate);
    
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

  const createAssessment = async (assessment: Omit<Assessment, 'id'>): Promise<string> => {
    const id = crypto.randomUUID();
    if (!session?.user.id) return id; 
    
    // VALIDATION: Check if Term is valid and open
    const term = await db.terms.get(assessment.term_id);
    if (!term) {
        throw new Error("Invalid term selected.");
    }
    
    const year = await db.academic_years.get(term.year_id);
    
    if (term.closed) {
        throw new Error(`Cannot create assessment. ${term.name} is closed.`);
    }
    if (year?.closed) {
        throw new Error(`Cannot create assessment. Academic Year ${year.name} is closed.`);
    }

    const data = { ...assessment, id, user_id: session.user.id };
    
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    showSuccess("Assessment created.");
    return id;
  };

  const deleteAssessment = async (id: string) => {
      // Could add validation here too, but UI usually handles it.
      await db.assessment_marks.where('assessment_id').equals(id).delete(); 
      await db.assessments.delete(id);
      await queueAction('assessments', 'delete', { id });
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => {
    if (!session?.user.id) return;
    
    const toUpsert = updates.map(u => ({
        ...u,
        user_id: session.user.id
    }));

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