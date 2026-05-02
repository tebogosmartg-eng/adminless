"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark, AssessmentQuestion } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabaseClient';
import { applySupabaseAssessmentOrder, sortAssessmentsDeterministically } from '@/utils/assessmentOrdering';
import { useAcademicSelection } from '@/hooks/useAcademicSelection';
import { useAcademicMigration } from '@/hooks/useAcademicMigration';
import { useAcademicAverages } from '@/hooks/useAcademicAverages';
import { canonicalizeQuestionMarksForSave, remapQuestionMarksByIndexToQuestionIds } from '@/utils/questionMarks';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AcademicContextType {
  years: AcademicYear[];
  terms: Term[];
  assessments: Assessment[];
  marks: AssessmentMark[];
  loading: boolean;
  isRefreshing: boolean;
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
  optimisticReorderAssessments: (
    classId: string,
    termId: string,
    payload: { id: string; position: number }[]
  ) => () => void;
  updateMarks: (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => Promise<{ success: boolean; message?: string }>;
  refreshAssessments: (classId: string, termId?: string, forceRefresh?: boolean) => Promise<void>;
  preloadMarkSheetData: (classId: string, termId: string, forceRefresh?: boolean) => Promise<void>;
  getPreloadedMarkSheetData: (classId: string, termId: string) => { assessments: Assessment[]; marks: AssessmentMark[] } | null;
  hasPreloadedMarkSheetData: (classId: string, termId: string) => boolean;
  toggleTermStatus: (termId: string, finalised: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
  recalculateAllActiveAverages: (silent?: boolean) => Promise<void>;
  runDataVacuum: () => Promise<void>;
  rollForwardClasses: (sourceTermId: string, targetTermId: string, preparedClasses: any[]) => Promise<void>;
  diagnosticMode: boolean;
  setDiagnosticMode: (active: boolean) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRELOAD_TTL_MS = 5 * 60 * 1000;

type MarkSheetPreloadEntry = {
  assessments: Assessment[];
  marks: AssessmentMark[];
  loadedAt: number;
};

const formatMarkSaveError = (errorMessage?: string) => {
  const raw = (errorMessage || "").trim();
  const message = raw.toLowerCase();
  if (message.includes("locked")) return raw || "This record is locked.";
  if (message.includes("exceeds max")) return "Mark exceeds allowed maximum";
  if (message.includes("invalid input syntax")) return "Invalid mark entered";
  return raw || "Failed to save marks";
};

const sanitizeQuestionMarks = (input: unknown): Record<string, number> => {
  if (!input || typeof input !== 'object') return {};

  const cleaned: Record<string, number> = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (!UUID_REGEX.test(key)) return;
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    cleaned[key] = value;
  });

  return cleaned;
};

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [currentClassFilter, setCurrentClassFilter] = useState<{classId: string, termId: string} | null>(null);
  const [, setMarkSheetPreloads] = useState<Record<string, MarkSheetPreloadEntry>>({});
  const markSheetPreloadsRef = useRef<Record<string, MarkSheetPreloadEntry>>({});
  const preloadInFlightRef = useRef<Record<string, Promise<void>>>({});
  const refreshingRef = useRef<Record<string, boolean>>({});
  const preloadRequestIdRef = useRef<Record<string, number>>({});
  /** Avoid repeating question_marks canonicalization UPDATEs on every marks refetch for the same row. */
  const questionMarkMigrationPersistedRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    questionMarkMigrationPersistedRef.current.clear();
  }, [session?.user?.id]);

  const { data: years = [], isLoading: loadingYears, isFetching: fetchingYears } = useQuery({
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

  const { data: allTerms = [], isLoading: loadingTerms, isFetching: fetchingTerms } = useQuery({
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

  const isContextReady = !!activeYear?.id && !!activeTerm?.id;

  const { data: assessments = [], isLoading: loadingAss, isFetching: fetchingAss } = useQuery({
    queryKey: ['assessments', session?.user?.id, currentClassFilter?.classId, currentClassFilter?.termId, activeTerm?.id, diagnosticMode],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
          const selectStr = '*, assessment_questions(*)';
          
          if (diagnosticMode) {
              const { data, error } = await applySupabaseAssessmentOrder(
                supabase.from('assessments').select(selectStr).eq('user_id', session.user.id)
              );
              if (error) throw error;
              return sortAssessmentsDeterministically(
                (data || []).map(a => ({ ...a, questions: a.assessment_questions }))
              );
          }
          
          const termId = currentClassFilter?.termId || activeTerm?.id;
          const classId = currentClassFilter?.classId;

          if (!classId || classId === 'undefined' || !termId || termId === 'undefined') return [];
          
          const { data, error } = await applySupabaseAssessmentOrder(
            supabase.from('assessments')
              .select(selectStr)
              .eq('class_id', classId)
              .eq('term_id', termId)
              .eq('user_id', session.user.id)
          );
          
          if (error) throw error;
          return sortAssessmentsDeterministically(
            (data || []).map(a => ({ ...a, questions: a.assessment_questions }))
          );
      } catch (e) {
          console.error("AdminLess error: Failed to fetch assessments", e);
          return [];
      }
    },
    enabled: !!session?.user?.id && (diagnosticMode || (isContextReady && !!currentClassFilter?.classId))
  });

  const { data: marks = [], isLoading: loadingMarks, isFetching: fetchingMarks } = useQuery({
    queryKey: ['assessment_marks', session?.user?.id, assessments.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      if (!session?.user?.id || assessments.length === 0) return [];
      try {
          const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
          const assIds = assessments.map((a: any) => a.id);
          const { data, error } = await supabase.from('assessment_marks')
            .select('*')
            .in('assessment_id', assIds)
            .eq('user_id', session.user.id);
          if (error) throw error;

          const rows = (data || []) as AssessmentMark[];
          const migratedRows: AssessmentMark[] = [];
          const persistenceUpdates: Promise<unknown>[] = [];

          rows.forEach((row) => {
            const assessment = assessmentById.get(row.assessment_id);
            const questions = assessment?.questions || [];
            if (questions.length === 0) {
              migratedRows.push(row);
              return;
            }

            const { mapped, changed } = remapQuestionMarksByIndexToQuestionIds(row.question_marks, questions);
            const questionIds = new Set(questions.map((question) => question.id).filter(Boolean));
            const nextQuestionMarks = changed ? mapped : (row.question_marks as Record<string, number | null> | undefined) || {};
            const nonCanonicalKeys = Object.keys(nextQuestionMarks).filter((key) => !questionIds.has(key));
            if (nonCanonicalKeys.length > 0) {
              console.warn("[marks] non-canonical keys after read", nonCanonicalKeys);
            }

            migratedRows.push({
              ...row,
              question_marks: nextQuestionMarks
            });

            if (!changed || !row.id) return;
            if (questionMarkMigrationPersistedRef.current.has(row.id)) return;

            persistenceUpdates.push(
              supabase
                .from('assessment_marks')
                .update({ question_marks: mapped })
                .eq('id', row.id)
                .eq('user_id', session.user.id)
                .then(() => {
                  questionMarkMigrationPersistedRef.current.add(row.id);
                })
            );
          });

          if (persistenceUpdates.length > 0) {
            const persistenceResults = await Promise.allSettled(persistenceUpdates);
            const failed = persistenceResults.filter((result) => result.status === 'rejected');
            if (failed.length > 0) {
              console.error("[academic] question_marks migration persistence failures", {
                failedCount: failed.length,
                attempted: persistenceUpdates.length
              });
            }
          }

          return migratedRows;
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
    } catch (e: any) {
        console.error("AdminLess error: Failed to create year", e);
        showError("Failed to initialize academic year: " + e.message);
        throw e;
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
    } catch (e: any) {
        console.error("AdminLess error: Failed to delete year", e);
        showError("Failed to delete academic year. Make sure it is empty.");
        throw e;
    }
  }, [queryClient]);

  const updateTerm = useCallback(async (term: Term) => {
    try {
        const payload = { ...term };
        delete (payload as any).is_finalised;
        const { error } = await supabase.from('terms').upsert(payload);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
    } catch (e: any) {
        console.error("AdminLess error: Failed to update term", e);
        showError("Failed to update term settings: " + e.message);
        throw e;
    }
  }, [queryClient]);

  const assertWritableClassTerm = useCallback(async (classId: string | undefined, termId: string | undefined) => {
    if (!session?.user?.id) throw new Error("Session context lost.");
    if (!classId || !termId) throw new Error("Missing class or term for this operation.");

    const termRow = allTerms.find((t) => t.id === termId);
    if (termRow?.closed) {
      throw new Error("This term is locked. Assessments and marks cannot be changed.");
    }

    const { data: cls, error } = await supabase
      .from("classes")
      .select("is_finalised")
      .eq("id", classId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (cls?.is_finalised) {
      throw new Error("This class is locked for the finalized term.");
    }
  }, [session?.user?.id, allTerms]);

  const createAssessment = useCallback(async (assessment: Omit<Assessment, 'id'>) => {
    if (!session?.user?.id || !activeYear) {
      showError("Session context lost. Please refresh.");
      return;
    }

    try {
        await assertWritableClassTerm(assessment.class_id, assessment.term_id);
        const id = crypto.randomUUID();
        const { questions, ...headerData } = assessment;
        
        const payload = { 
            ...headerData, 
            id, 
            user_id: session.user.id,
            academic_year_id: activeYear.id
        };
        delete (payload as any).assessment_questions;

        const { error: headerError } = await supabase.from('assessments').insert(payload);
        if (headerError) throw headerError;

        if (questions && questions.length > 0) {
            const questionPayloads = questions.map(q => ({
                assessment_id: id,
                user_id: session.user.id,
                question_number: q.question_number,
                skill_description: q.skill_description,
                topic: q.topic,
                cognitive_level: q.cognitive_level,
                max_mark: q.max_mark
            }));

            const { error: qError } = await supabase.from('assessment_questions').insert(questionPayloads);
            if (qError) throw qError;
        }

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        showSuccess(`Assessment "${assessment.title}" recorded.`);
        return id;
    } catch (e: any) {
        console.error("FAT Save Failure:", e);
        showError("Failed to record assessment: " + e.message);
        throw e;
    }
  }, [session?.user?.id, activeYear, queryClient, assertWritableClassTerm]);

  const updateAssessment = useCallback(async (a: Assessment) => {
    try {
        await assertWritableClassTerm(a.class_id, a.term_id);
        const { questions, ...headerData } = a;
        
        const payload = {
            ...headerData,
            user_id: session?.user?.id
        };
        delete (payload as any).assessment_questions;

        const { error: headerError } = await supabase.from('assessments').upsert(payload);
        if (headerError) throw headerError;

        if (questions) {
            await supabase.from('assessment_questions').delete().eq('assessment_id', a.id);
            if (questions.length > 0) {
                const questionPayloads = questions.map(q => ({
                    assessment_id: a.id,
                    user_id: session?.user?.id,
                    question_number: q.question_number,
                    skill_description: q.skill_description,
                    topic: q.topic,
                    cognitive_level: q.cognitive_level,
                    max_mark: q.max_mark
                }));
                const { error: qError } = await supabase.from('assessment_questions').insert(questionPayloads);
                if (qError) throw qError;
            }
        }

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        showSuccess("Assessment settings updated.");
    } catch (e: any) {
        console.error("AdminLess error: Failed to update assessment", e);
        showError("Failed to update assessment: " + e.message);
        throw e;
    }
  }, [session?.user?.id, queryClient, assertWritableClassTerm]);

  const deleteAssessment = useCallback(async (id: string) => {
    if (!confirm("Delete this assessment? This will permanently remove all marks and data.")) return;

    try {
        let classId: string | undefined;
        let termId: string | undefined;
        const local = assessments.find((x) => x.id === id);
        if (local?.class_id && local?.term_id) {
          classId = local.class_id;
          termId = local.term_id;
        } else if (session?.user?.id) {
          const { data, error } = await supabase
            .from("assessments")
            .select("class_id, term_id")
            .eq("id", id)
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (error) throw error;
          classId = data?.class_id;
          termId = data?.term_id;
        }
        await assertWritableClassTerm(classId, termId);

        await supabase.from('assessment_marks').delete().eq('assessment_id', id); 
        const { error: aErr } = await supabase.from('assessments').delete().eq('id', id);
        if (aErr) throw aErr;

        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
        showSuccess("Assessment deleted.");
    } catch (e: any) {
        console.error("AdminLess error: Failed to delete assessment", e);
        showError("Failed to delete assessment: " + e.message);
        throw e;
    }
  }, [queryClient, assessments, session?.user?.id, assertWritableClassTerm]);

  const optimisticReorderAssessments = useCallback((
    classId: string,
    termId: string,
    payload: { id: string; position: number }[]
  ) => {
    if (!session?.user?.id || payload.length === 0) {
      return () => {};
    }

    const positionById = new Map(payload.map((item) => [item.id, item.position]));
    const previousQueryData = queryClient.getQueriesData<Assessment[]>({
      queryKey: ['assessments', session.user.id],
    });

    const applyPositions = (items: Assessment[]) => {
      const next = items.map((assessment) => {
        if (assessment.class_id !== classId || assessment.term_id !== termId) {
          return assessment;
        }
        const nextPosition = positionById.get(assessment.id);
        if (!nextPosition) return assessment;
        return { ...assessment, position: nextPosition };
      });
      return sortAssessmentsDeterministically(next);
    };

    queryClient.setQueriesData<Assessment[]>(
      { queryKey: ['assessments', session.user.id] },
      (existing) => {
        if (!Array.isArray(existing)) return existing;
        return applyPositions(existing);
      }
    );

    const preloadKey = `${classId}::${termId}`;
    const previousPreloadEntry = markSheetPreloadsRef.current[preloadKey];
    if (previousPreloadEntry) {
      const nextPreloadEntry: MarkSheetPreloadEntry = {
        ...previousPreloadEntry,
        assessments: applyPositions(previousPreloadEntry.assessments),
      };
      markSheetPreloadsRef.current = {
        ...markSheetPreloadsRef.current,
        [preloadKey]: nextPreloadEntry,
      };
      setMarkSheetPreloads((prev) => ({ ...prev, [preloadKey]: nextPreloadEntry }));
    }

    return () => {
      previousQueryData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (previousPreloadEntry) {
        markSheetPreloadsRef.current = {
          ...markSheetPreloadsRef.current,
          [preloadKey]: previousPreloadEntry,
        };
        setMarkSheetPreloads((prev) => ({ ...prev, [preloadKey]: previousPreloadEntry }));
      }
    };
  }, [session?.user?.id, queryClient]);

  const updateMarks = useCallback(async (updates: (Partial<AssessmentMark> & { assessment_id: string; learner_id: string })[]) => {
    if (!session?.user?.id || updates.length === 0) return { success: true };
    try {
        const assessmentIds = Array.from(new Set(updates.map((update) => update.assessment_id)));
        const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
        const missingAssessmentIds = assessmentIds.filter((id) => !assessmentById.has(id));

        if (missingAssessmentIds.length > 0) {
          const { data: fetchedAssessments, error: assessmentLookupError } = await supabase
            .from('assessments')
            .select('id, term_id, class_id, assessment_questions(*)')
            .eq('user_id', session.user.id)
            .in('id', missingAssessmentIds);
          if (assessmentLookupError) throw assessmentLookupError;
          (fetchedAssessments || []).forEach((assessment) => {
            assessmentById.set(assessment.id, { ...assessment, questions: assessment.assessment_questions } as Assessment);
          });
        }

        const termIds = Array.from(
          new Set(
            assessmentIds
              .map((id) => assessmentById.get(id)?.term_id)
              .filter((termId): termId is string => !!termId)
          )
        );
        const lockedTermIds = new Set(allTerms.filter((term) => !!term.closed).map((term) => term.id));
        const unresolvedTermIds = termIds.filter((termId) => !lockedTermIds.has(termId));
        if (unresolvedTermIds.length > 0) {
          const { data: termRows, error: termLookupError } = await supabase
            .from('terms')
            .select('id, closed')
            .eq('user_id', session.user.id)
            .in('id', unresolvedTermIds);
          if (termLookupError) throw termLookupError;
          (termRows || []).forEach((term) => {
            if (term.closed) lockedTermIds.add(term.id);
          });
        }

        const classIds = Array.from(
          new Set(
            assessmentIds
              .map((aid) => assessmentById.get(aid)?.class_id)
              .filter((cid): cid is string => !!cid)
          )
        );
        if (classIds.length > 0) {
          const { data: classRows, error: classLookupError } = await supabase
            .from("classes")
            .select("id, is_finalised")
            .eq("user_id", session.user.id)
            .in("id", classIds);
          if (classLookupError) throw classLookupError;
          const finalisedClassIds = new Set(
            (classRows || []).filter((row) => row.is_finalised).map((row) => row.id)
          );
          const blockedByClass = updates.find((update) => {
            const assessment = assessmentById.get(update.assessment_id);
            return assessment && finalisedClassIds.has(assessment.class_id);
          });
          if (blockedByClass) {
            throw new Error("This class is locked for the finalized term. Marks and comments cannot be changed.");
          }
        }

        const blockedUpdate = updates.find((update) => {
          const assessment = assessmentById.get(update.assessment_id);
          if (!assessment) return true;
          return lockedTermIds.has(assessment.term_id);
        });
        if (blockedUpdate) {
          throw new Error("This term is locked. Marks and comments cannot be changed.");
        }

        for (const update of updates) {
            const existing = marks.find(
              m => m.assessment_id === update.assessment_id && m.learner_id === update.learner_id
            );
            const assessment = assessmentById.get(update.assessment_id);
            const validQuestionIds = new Set((assessment?.questions || []).map(q => q.id));

            let nextScore = update.score ?? existing?.score ?? null;
            let nextQuestionMarksForSave = update.question_marks !== undefined
              ? sanitizeQuestionMarks(update.question_marks)
              : sanitizeQuestionMarks(existing?.question_marks);
            const hasQuestionMarks = Object.keys(nextQuestionMarksForSave).length > 0;

            if (update.question_marks !== undefined) {
              const { canonical, missingQuestionIds, unexpectedKeys } = canonicalizeQuestionMarksForSave(
                update.question_marks,
                assessment?.questions || []
              );
              if (missingQuestionIds.length > 0 || unexpectedKeys.length > 0) {
                const invalidPayload = {
                  assessmentId: update.assessment_id,
                  learnerId: update.learner_id,
                  incomingKeys:
                    update.question_marks && typeof update.question_marks === "object"
                      ? Object.keys(update.question_marks as Record<string, unknown>)
                      : [],
                  expectedQuestionIds: Array.from(validQuestionIds),
                  missingQuestionIds,
                  unexpectedKeys,
                };
                console.error("[marks] invalid question_marks on save", invalidPayload);
                throw new Error("Invalid question marks payload.");
              }

              nextQuestionMarksForSave = canonical;
              const summedScore = Object.values(nextQuestionMarksForSave).reduce((sum, value) => {
                if (!isNaN(value)) return sum + value;
                return sum;
              }, 0);
              nextScore = Object.keys(nextQuestionMarksForSave).length > 0 ? parseFloat(summedScore.toFixed(1)) : null;
              console.log("Saving:", nextQuestionMarksForSave);
            }

            const payload = {
              user_id: session.user.id,
              score: nextScore,
              comment: update.comment ?? existing?.comment ?? "",
              question_marks: update.question_marks !== undefined ? nextQuestionMarksForSave : (existing?.question_marks ?? {}),
              rubric_selections: update.rubric_selections ?? existing?.rubric_selections ?? null
            };

            const { data: updatedRows, error: updateError } = await supabase
              .from('assessment_marks')
              .update(payload)
              .eq('learner_id', update.learner_id)
              .eq('assessment_id', update.assessment_id)
              .eq('user_id', session.user.id)
              .select('id');

            if (updateError) throw updateError;

            // Fallback for first-write rows that don't exist yet.
            if (!updatedRows || updatedRows.length === 0) {
              const { error: insertError } = await supabase.from('assessment_marks').insert({
                ...payload,
                assessment_id: update.assessment_id,
                learner_id: update.learner_id
              });
              if (insertError) throw insertError;
            }
        }

        await queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
        updateLearnerActiveAverages(Array.from(new Set(updates.map(u => u.learner_id))));
        return { success: true };
    } catch (e: any) {
        console.error("AdminLess error: Failed to update marks", e);
        const message = formatMarkSaveError(e?.message);
        showError(message);
        return { success: false, message };
    }
  }, [session?.user?.id, updateLearnerActiveAverages, queryClient, marks, assessments, allTerms]);

  const preloadMarkSheetData = useCallback(async (classId: string, termId: string, forceRefresh = false) => {
    if (!session?.user?.id || !classId || !termId || termId === 'undefined') return;
    const key = `${classId}::${termId}`;
    const existing = markSheetPreloadsRef.current[key];
    if (!forceRefresh && existing && Date.now() - existing.loadedAt < PRELOAD_TTL_MS) return;
    if (refreshingRef.current[key] && preloadInFlightRef.current[key]) {
      await preloadInFlightRef.current[key];
      return;
    }
    refreshingRef.current[key] = true;
    const requestId = (preloadRequestIdRef.current[key] || 0) + 1;
    preloadRequestIdRef.current[key] = requestId;

    const run = (async () => {
      try {
        const selectStr = '*, assessment_questions(*)';
        const { data: assData, error: assError } = await applySupabaseAssessmentOrder(
          supabase
            .from('assessments')
            .select(selectStr)
            .eq('class_id', classId)
            .eq('term_id', termId)
            .eq('user_id', session.user.id)
        );
        if (assError) throw assError;

        const mappedAssessments = sortAssessmentsDeterministically(
          (assData || []).map(a => ({ ...a, questions: a.assessment_questions })) as Assessment[]
        );
        const assIds = mappedAssessments.map(a => a.id);

        let mappedMarks: AssessmentMark[] = [];
        if (assIds.length > 0) {
          const { data: markData, error: markError } = await supabase
            .from('assessment_marks')
            .select('*')
            .in('assessment_id', assIds)
            .eq('user_id', session.user.id);
          if (markError) throw markError;
          mappedMarks = (markData || []) as AssessmentMark[];
        }

        const loadedAt = Date.now();
        const entry: MarkSheetPreloadEntry = { assessments: mappedAssessments, marks: mappedMarks, loadedAt };
        if (preloadRequestIdRef.current[key] !== requestId) return;
        markSheetPreloadsRef.current = { ...markSheetPreloadsRef.current, [key]: entry };
        setMarkSheetPreloads(prev => ({ ...prev, [key]: entry }));

        const assKey = ['assessments', session.user.id, classId, termId, activeTerm?.id, diagnosticMode];
        const marksKey = ['assessment_marks', session.user.id, assIds.join(',')];
        queryClient.setQueryData(assKey, mappedAssessments, { updatedAt: loadedAt });
        queryClient.setQueryData(marksKey, mappedMarks, { updatedAt: loadedAt });
      } catch (e) {
        console.error("AdminLess error: Marksheet preload failed", e);
      }
    })();
    preloadInFlightRef.current[key] = run;
    try {
      await run;
    } finally {
      if (preloadRequestIdRef.current[key] === requestId) {
        refreshingRef.current[key] = false;
      }
      delete preloadInFlightRef.current[key];
    }
  }, [session?.user?.id, queryClient, activeTerm?.id, diagnosticMode]);

  const refreshAssessments = useCallback(async (c: string, t?: string, forceRefresh = false) => {
    const targetTermId = t || activeTerm?.id || '';
    if (!targetTermId || targetTermId === 'undefined') return;
    setCurrentClassFilter(prev => {
      if (prev?.classId === c && prev?.termId === targetTermId) return prev;
      return { classId: c, termId: targetTermId };
    });
    if (forceRefresh) {
      await preloadMarkSheetData(c, targetTermId, true);
    }
  }, [activeTerm?.id, preloadMarkSheetData]);

  const getPreloadedMarkSheetData = useCallback((classId: string, termId: string) => {
    if (!classId || !termId || termId === 'undefined') return null;
    const key = `${classId}::${termId}`;
    const entry = markSheetPreloadsRef.current[key];
    if (!entry) return null;
    if (Date.now() - entry.loadedAt > PRELOAD_TTL_MS) return null;
    return { assessments: entry.assessments, marks: entry.marks };
  }, []);

  const hasPreloadedMarkSheetData = useCallback((classId: string, termId: string) => {
    if (!classId || !termId || termId === 'undefined') return false;
    const key = `${classId}::${termId}`;
    const entry = markSheetPreloadsRef.current[key];
    if (!entry) return false;
    return Date.now() - entry.loadedAt <= PRELOAD_TTL_MS;
  }, []);

  const loading = loadingYears || loadingTerms || loadingAss || loadingMarks;
  const isRefreshing =
    (fetchingYears && !loadingYears) ||
    (fetchingTerms && !loadingTerms) ||
    (fetchingAss && !loadingAss) ||
    (fetchingMarks && !loadingMarks);

  const toggleTermStatus = useCallback(async (termId: string, finalised: boolean) => {
    try {
        const { error } = await supabase.from('terms').update({ closed: finalised }).eq('id', termId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['terms'] });
    } catch (e: any) {
        console.error("AdminLess error: Failed to toggle term status", e);
        showError("Failed to update term status: " + e.message);
        throw e;
    }
  }, [queryClient]);

  const closeYear = useCallback(async (id: string) => {
    try {
        const { error } = await supabase.from('academic_years').update({ closed: true }).eq('id', id);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    } catch (e: any) {
        console.error("AdminLess error: Failed to close year", e);
        showError("Failed to finalise academic year: " + e.message);
        throw e;
    }
  }, [queryClient]);

  const rollForwardClasses = useCallback(async (s: string, t: string, d: any[]) => {
      try {
          await doRollForward(activeYear?.id || '', s, t, d, setActiveTerm);
      } catch (e: any) {
          console.error("AdminLess error: Roll forward failed", e);
          showError("Failed to roll forward classes: " + e.message);
          throw e;
      }
  }, [doRollForward, activeYear?.id, setActiveTerm]);

  const value = useMemo(() => ({
    years, terms, assessments, marks, 
    loading,
    isRefreshing,
    activeYear, activeTerm, setActiveYear, setActiveTerm, 
    createYear, deleteYear, updateTerm,
    createAssessment, updateAssessment, deleteAssessment,
    optimisticReorderAssessments, updateMarks, refreshAssessments, preloadMarkSheetData, getPreloadedMarkSheetData, hasPreloadedMarkSheetData, toggleTermStatus, closeYear,
    recalculateAllActiveAverages, runDataVacuum, rollForwardClasses,
    diagnosticMode, setDiagnosticMode
  }), [
    years, terms, assessments, marks, activeYear, activeTerm, 
    setActiveYear, setActiveTerm, createYear, deleteYear, updateTerm, 
    createAssessment, updateAssessment, deleteAssessment, optimisticReorderAssessments, updateMarks, 
    refreshAssessments, preloadMarkSheetData, getPreloadedMarkSheetData, hasPreloadedMarkSheetData, toggleTermStatus, closeYear, recalculateAllActiveAverages, 
    runDataVacuum, rollForwardClasses, diagnosticMode, loading, isRefreshing
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