import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  recalculateAllActiveAverages: () => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  
  const years = useLiveQuery(() => db.academic_years.orderBy('name').reverse().toArray()) || [];
  
  const activeYear = years.find(y => y.id === activeYearId) || years.find(y => !y.closed) || years[0] || null;

  const terms = useLiveQuery(async () => {
      if (!activeYear) return [];
      return db.terms.where('year_id').equals(activeYear.id).sortBy('name');
  }, [activeYear?.id]) || [];

  // Logic: Active term is the ONLY one that is NOT closed.
  useEffect(() => {
      if (terms.length > 0) {
          const openTerm = terms.find(t => !t.closed);
          // If we found an open term, that MUST be the active working term
          if (openTerm) {
              setActiveTermId(openTerm.id);
          } else if (!activeTermId) {
              // If none are open and we don't have a selection, default to the last one (most recent)
              setActiveTermId(terms[terms.length - 1].id);
          }
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

  const updateLearnerActiveAverages = useCallback(async (learnerIds: string[]) => {
    // Only update averages if there is an OPEN term to work on
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

        let weightedSum = 0;
        termAssessments.forEach(ass => {
            const m = learnerMarks.find(mark => mark.assessment_id === ass.id);
            if (m && m.score !== null) {
                weightedSum += (Number(m.score) / ass.max_mark) * ass.weight;
            }
        });

        const newAverage = weightedSum.toFixed(1).replace(/\.0$/, '');
        await db.learners.update(learnerId, { mark: newAverage });
        await queueAction('learners', 'update', { id: learnerId, mark: newAverage });
    }
  }, [terms]);

  const recalculateAllActiveAverages = async () => {
      const openTerm = terms.find(t => !t.closed);
      if (!openTerm) return;
      const allLearners = await db.learners.toArray();
      const ids = allLearners.map(l => l.id!);
      await updateLearnerActiveAverages(ids);
      showSuccess("All class averages recalculated based on the active open term.");
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
      closed: idx !== 0, // Only the first term is open by default
      weight: 25
    }));

    await db.terms.bulkAdd(termsToCreate as any);
    await queueAction('terms', 'create', termsToCreate);
    showSuccess(`Academic Year ${name} created. ${termsToCreate[0].name} is now your active working term.`);
  };

  const updateTerm = async (term: Term) => {
     const oldTerm = await db.terms.get(term.id);
     await db.terms.put(term);
     await queueAction('terms', 'update', term);
     
     if (oldTerm?.weight !== term.weight) {
         recalculateAllActiveAverages();
     }
     showSuccess('Term configuration updated.');
  };
  
  const toggleTermStatus = async (termId: string, closed: boolean) => {
      // Check if we are opening a term when another is already open
      if (!closed) {
          const alreadyOpen = terms.find(t => !t.closed && t.id !== termId);
          if (alreadyOpen) {
              throw new Error(`Cannot open this term. ${alreadyOpen.name} is still active. Finalize it first.`);
          }
      }

      await db.terms.update(termId, { closed });
      await queueAction('terms', 'update', { id: termId, closed });
      
      if (!closed) {
          setActiveTermId(termId);
      }
      
      showSuccess(`Term ${closed ? 'finalized' : 'activated for editing'}.`);
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
    
    const term = await db.terms.get(assessment.term_id);
    if (!term) throw new Error("Invalid term selected.");
    if (term.closed) throw new Error(`Editing restricted. ${term.name} is finalized.`);

    const data = { ...assessment, id, user_id: session.user.id };
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
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

      if (!term?.closed) {
          await updateLearnerActiveAverages(affectedLearnerIds);
      }
      showSuccess("Assessment deleted.");
  };

  const updateMarks = async (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => {
    if (!session?.user.id || updates.length === 0) return;
    
    // Check if the assessment belongs to a closed term
    const firstAssId = updates[0].assessment_id;
    const ass = await db.assessments.get(firstAssId);
    if (ass) {
        const term = await db.terms.get(ass.term_id);
        if (term?.closed) {
            showError("Cannot modify marks in a finalized term.");
            return;
        }
    }

    const toUpsert = updates.map(u => ({
        ...u,
        user_id: session.user.id
    }));

    await db.assessment_marks.bulkPut(toUpsert as any);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    
    const learnerIds = Array.from(new Set(updates.map(u => u.learner_id)));
    await updateLearnerActiveAverages(learnerIds);
    
    showSuccess("Marks saved.");
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