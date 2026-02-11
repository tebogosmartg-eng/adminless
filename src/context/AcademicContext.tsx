"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark, Activity } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';

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

const STORAGE_KEYS = {
  YEAR: 'adminless_active_year_id',
  TERM: 'adminless_active_term_id'
};

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
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

  // DIAGNOSTIC LOGGING FOR CONTEXT STATE
  useEffect(() => {
    console.group("[Diagnostic] Academic Context State");
    console.log("Active Year ID:", activeYearId);
    console.log("Active Year Object:", activeYear);
    console.log("Active Term ID:", activeTermId);
    console.log("Active Term Object:", activeTerm);
    console.log("Total Terms found for current year:", terms.length);
    console.groupEnd();
  }, [activeYearId, activeYear, activeTermId, activeTerm, terms]);

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

  const updateLearnerActiveAverages = useCallback(async (learnerIds: string[]) => {
    if (learnerIds.length === 0) return;

    for (const learnerId of learnerIds) {
        const learner = await db.learners.get(learnerId);
        if (!learner) continue;

        const classInfo = await db.classes.get(learner.class_id);
        if (!classInfo) continue;

        const termAssessments = await db.assessments
            .where('[class_id+term_id]')
            .equals([learner.class_id, classInfo.term_id])
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
  }, []);

  const recalculateAllActiveAverages = async () => {
      // Data Integrity Check: Resolve duplicate marks that might have been created due to ID mismatches
      const allMarks = await db.assessment_marks.toArray();
      const markGroups: Record<string, string[]> = {};
      
      allMarks.forEach(m => {
          const key = `${m.assessment_id}-${m.learner_id}`;
          if (!markGroups[key]) markGroups[key] = [];
          markGroups[key].push(m.id);
      });

      // Delete duplicates locally to clean up state
      const toDeleteLocally: string[] = [];
      Object.values(markGroups).forEach(ids => {
          if (ids.length > 1) {
              // Keep the latest one, delete others
              toDeleteLocally.push(...ids.slice(0, ids.length - 1));
          }
      });

      if (toDeleteLocally.length > 0) {
          await db.assessment_marks.bulkDelete(toDeleteLocally);
      }

      const allLearners = await db.learners.toArray();
      const ids = allLearners.map(l => l.id!);
      
      await db.transaction('rw', [db.learners, db.classes, db.assessments, db.assessment_marks, db.sync_queue], async () => {
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
    
    logInternalActivity(`Created academic cycle: "${name}"`, yearId, firstTermId);
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

      if (activeYearId === yearId) setActiveYear(null);
      logInternalActivity(`Deleted academic cycle: "${year.name}"`, yearId, termIds[0]);
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
     if (oldTerm?.weight !== term.weight) recalculateAllActiveAverages();
     
     logInternalActivity(`Updated configuration for: "${term.name}"`, term.year_id, term.id);
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
      
      logInternalActivity(`${closed ? 'Finalized' : 'Re-opened'} academic term: "${term.name}"`, term.year_id, term.id);
      showSuccess(`Term ${closed ? 'finalized' : 'activated'}.`);
  };

  const migrateLegacyData = async (yearId: string, termId: string): Promise<MigrationReport> => {
    const report: MigrationReport = { success: false, counts: {}, total: 0 };
    const tables = ['classes', 'assessments', 'activities', 'todos', 'learner_notes', 'evidence', 'attendance'];

    try {
        await db.transaction('rw', [
            db.classes, db.assessments, db.activities, db.todos, 
            db.learner_notes, db.evidence, db.attendance, db.sync_queue, db.learners
        ], async () => {
            for (const table of tables) {
                // @ts-ignore
                const all = await db[table].toArray();
                const legacy = all.filter((i: any) => !i.year_id || !i.term_id);
                
                if (legacy.length > 0) {
                    const updates = legacy.map((item: any) => {
                        const newItem = {
                            ...item,
                            year_id: yearId,
                            term_id: termId,
                            user_id: item.user_id || session?.user.id
                        };

                        // Fix nomenclature discrepancy identified in validation
                        if (table === 'classes' && newItem.class_name && !newItem.className) {
                            newItem.className = newItem.class_name;
                            delete newItem.class_name;
                        }

                        return newItem;
                    });

                    // @ts-ignore
                    await db[table].bulkPut(updates);
                    await queueAction(table, 'upsert', updates);
                    
                    report.counts[table] = legacy.length;
                    report.total += legacy.length;
                }
            }
        });

        // Post-Migration calculation repair
        if (report.total > 0) {
            await recalculateAllActiveAverages();
            const auditMsg = `[MIGRATION] Finalized architectural alignment for ${report.total} records.`;
            await logInternalActivity(auditMsg, yearId, termId);
        }

        report.success = true;
        return report;
    } catch (e) {
        console.error("[migration] failed", e);
        return { ...report, success: false };
    }
  };

  const rollForwardClasses = async (sourceTermId: string, targetTermId: string, preparedClasses: any[]) => {
    if (!session?.user.id || !activeYear) return;
    
    try {
        const sourceTerm = await db.terms.get(sourceTermId);
        const targetTerm = await db.terms.get(targetTermId);
        
        if (!sourceTerm || !targetTerm) throw new Error("Invalid term context.");

        await db.transaction('rw', [db.classes, db.learners, db.sync_queue], async () => {
            for (const sClass of preparedClasses) {
                const newClassId = crypto.randomUUID();
                
                const newClass = {
                    id: newClassId,
                    user_id: session.user.id,
                    year_id: activeYear.id,
                    term_id: targetTermId,
                    grade: sClass.grade,
                    subject: sClass.subject,
                    className: sClass.className,
                    archived: false,
                    notes: `Clean roster rolled forward from ${sourceTerm.name}`,
                    created_at: new Date().toISOString()
                };

                await db.classes.add(newClass);
                await queueAction('classes', 'create', newClass);

                const newLearners = sClass.learners.map((l: any) => ({
                    id: crypto.randomUUID(),
                    class_id: newClassId,
                    name: l.name,
                    mark: "", 
                    comment: "" 
                }));

                if (newLearners.length > 0) {
                    await db.learners.bulkAdd(newLearners as any);
                    await queueAction('learners', 'create', newLearners);
                }
            }
        });

        const auditLog = `[AUDIT: ROLL_FORWARD] Source: ${sourceTerm.name} Target: ${targetTerm.name} (${preparedClasses.length} Rosters)`;
        logInternalActivity(auditLog, activeYear.id, targetTermId);
        
        showSuccess(`Successfully migrated rosters to ${targetTerm.name}.`);
        setActiveTerm(targetTerm);
        
    } catch (e: any) {
        showError(e.message);
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
    
    logInternalActivity(`Permanently finalized academic year.`, yearId, yearTerms[yearTerms.length-1].id);
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
      logInternalActivity(`Updated assessment settings: "${assessment.title}"`, activeYear.id, assessment.term_id);
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

    // 1. Resolve architectural context and finalized status
    const assIds = [...new Set(updates.map(u => u.assessment_id))];
    const targetAssessments = await db.assessments.where('id').anyOf(assIds).toArray();
    const termIds = [...new Set(targetAssessments.map(a => a.term_id))];
    const targetTerms = await db.terms.where('id').anyOf(termIds).toArray();
    
    if (targetTerms.some(t => t.closed)) { 
        showError("Finalized terms are read-only."); 
        return; 
    }

    // 2. Critical Fix: Preserve unique record ID to prevent duplicate rows on server sync
    // This ensures that corrected marks overwrite previous invalid marks.
    const toUpsert: AssessmentMark[] = [];
    
    for (const update of updates) {
        // Try to find existing mark ID for this specific learner/assessment combo
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

    // 3. Save locally and queue for sync
    await db.assessment_marks.bulkPut(toUpsert);
    await queueAction('assessment_marks', 'upsert', toUpsert);
    
    // 4. Update the aggregate summary marks in the background
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