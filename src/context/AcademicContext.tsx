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
      if (terms.length > 0 && !activeTermId) {
          const now = new Date().toISOString();
          const current = terms.find(t => t.start_date && t.end_date && now >= t.start_date && now <= t.end_date) || terms[0];
          setActiveTermId(current.id);
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
    
    const term = await db.terms.get(assessment.term_id);
    if (!term) throw new Error("Invalid term selected.");
    
    const year = await db.academic_years.get(term.year_id);
    
    if (term.closed) throw new Error(`Cannot create assessment. ${term.name} is closed.`);
    if (year?.closed) throw new Error(`Cannot create assessment. Academic Year ${year.name} is closed.`);

    const data = { ...assessment, id, user_id: session.user.id };
    
    await db.assessments.add(data);
    await queueAction('assessments', 'create', data);
    showSuccess("Assessment created.");
    return id;
  };

  const deleteAssessment = async (id: string) => {
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

    // SYNC Logic: Update learner "mark" field (Legacy field used for Dashboard/Class Cards)
    // Only if we are updating marks for the ACTIVE term
    if (activeTerm) {
        // Group updates by assessment to check if they belong to active term
        // Optimization: Just check one since usually bulk updates are for same assessment, or assume mixed.
        // We will fetch ALL assessments for the active term to recalculate averages for affected learners.
        
        const learnerIds = new Set(updates.map(u => u.learner_id));
        const affectedLearners = Array.from(learnerIds);

        // Fetch assessments for active term (for the classes these learners belong to? A bit complex)
        // Simplification: We assume updates are happening within the context of a class usually.
        // But here we need to be generic. 
        
        // Let's iterate affected learners and recalculate their Active Term Average
        for (const learnerId of affectedLearners) {
            // Get learner to find their class
            const learner = await db.learners.get(learnerId);
            if (!learner) continue;

            // Get all assessments for this learner's class in the active term
            const termAssessments = await db.assessments
                .where('[class_id+term_id]')
                .equals([learner.class_id, activeTerm.id])
                .toArray();
            
            if (termAssessments.length === 0) continue;

            const assessmentIds = termAssessments.map(a => a.id);
            const learnerMarks = await db.assessment_marks
                .where('assessment_id')
                .anyOf(assessmentIds)
                .and(m => m.learner_id === learnerId)
                .toArray();

            // Calculate Average
            let weightedSum = 0;
            // Total weight should be based on assessments that HAVE marks or ALL assessments? 
            // Usually weighted average of what's been marked so far.
            // Or sum of weighted scores.
            
            termAssessments.forEach(ass => {
                const m = learnerMarks.find(mark => mark.assessment_id === ass.id);
                if (m && m.score !== null) {
                    const val = Number(m.score);
                    const weighted = (val / ass.max_mark) * ass.weight;
                    weightedSum += weighted;
                }
            });

            const newAverage = weightedSum.toFixed(1).replace(/\.0$/, '');
            
            // Update learner
            await db.learners.update(learnerId, { mark: newAverage });
            // We don't necessarily need to sync this 'mark' field update immediately if we treat it as derived data,
            // but for consistency across devices we should.
            await queueAction('learners', 'update', { id: learnerId, mark: newAverage });
        }
    }
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