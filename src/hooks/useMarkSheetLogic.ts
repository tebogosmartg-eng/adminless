import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { Learner, ClassInfo, Assessment, Rubric, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { validateMarkEntry } from '@/utils/integrity';
import { isLocked } from '@/utils/termLock';
import { supabase } from "@/lib/supabaseClient";
import { logAdminLessError } from '@/utils/logAdminLessError';
import { useDebounce } from '@/hooks/useDebounce';

type CellSaveStatus = 'saving' | 'saved' | 'error';


export const useMarkSheetLogic = (classInfo: ClassInfo) => {
  const { 
    terms,
    activeTerm, 
    setActiveTerm,
    activeYear,
    assessments, 
    marks, 
    createAssessment,
    updateAssessment,
    deleteAssessment, 
    optimisticReorderAssessments,
    refreshAssessments,
    updateMarks,
    getPreloadedMarkSheetData
  } = useAcademic();

  const { atRiskThreshold } = useSettings();
  const [availableRubrics, setAvailableRubrics] = useState<Rubric[]>([]);
  const preloadedMarkSheetData = useMemo(() => {
    if (!activeTerm?.id) return null;
    return getPreloadedMarkSheetData(classInfo.id, activeTerm.id);
  }, [getPreloadedMarkSheetData, classInfo.id, activeTerm?.id]);

  const contextAssessments = useMemo(
    () => assessments.filter(a => a.class_id === classInfo.id && a.term_id === activeTerm?.id),
    [assessments, classInfo.id, activeTerm?.id]
  );

  const shouldUsePreloadedData = contextAssessments.length === 0 && !!preloadedMarkSheetData;
  const resolvedAssessments = shouldUsePreloadedData ? preloadedMarkSheetData.assessments : contextAssessments;
  const resolvedMarks = shouldUsePreloadedData ? preloadedMarkSheetData.marks : marks;

useEffect(() => {
  let isMounted = true;

  const fetchRubrics = async () => {
    const { data, error } = await supabase
      .from("rubrics")
      .select("*");

    if (error) {
      logAdminLessError('marksheet_rubrics_fetch', error);
      return;
    }

    if (isMounted) {
      setAvailableRubrics(data || []);
    }
  };

  fetchRubrics();

  return () => {
    isMounted = false;
  };
}, []);
  // UI state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const [rubricMarking, setRubricMarking] = useState<{ 
    open: boolean; 
    rubric: Rubric | null; 
    learner: Learner | null; 
    assessmentId: string | null 
  }>({ open: false, rubric: null, learner: null, assessmentId: null });

  const [activeTool, setActiveTool] = useState<{ type: 'rapid' | 'voice' | null, assessmentId: string | null, termId: string | null }>({ type: null, assessmentId: null, termId: null });
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "", rubricId: "", termId: "", questions: [] });
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [saveSuccessTick, setSaveSuccessTick] = useState(0);
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [editedComments, setEditedComments] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isReorderingAssessments, setIsReorderingAssessments] = useState(false);
  const markSaveSequenceRef = useRef<Record<string, number>>({});
  const markSaveInFlightRef = useRef<Record<string, string>>({});
  const pendingMarkSaveCountRef = useRef(0);
  const cellStatusTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [cellSaveStatus, setCellSaveStatus] = useState<Record<string, CellSaveStatus>>({});
  const sheetLocked = isLocked(activeYear, activeTerm) || !!classInfo.is_finalised;

  const clearCellStatusTimer = useCallback((key: string) => {
    const timer = cellStatusTimersRef.current[key];
    if (!timer) return;
    clearTimeout(timer);
    delete cellStatusTimersRef.current[key];
  }, []);

  const scheduleCellStatusReset = useCallback((key: string, status: CellSaveStatus, delayMs: number) => {
    clearCellStatusTimer(key);
    cellStatusTimersRef.current[key] = setTimeout(() => {
      setCellSaveStatus((prev) => {
        if (prev[key] !== status) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete cellStatusTimersRef.current[key];
    }, delayMs);
  }, [clearCellStatusTimer]);

  // Term picker default — ClassDetails owns refreshAssessments / filter alignment for this class.
  useEffect(() => {
    if (activeTerm?.id && classInfo.id && activeTerm.id !== 'undefined') {
        setNewAss(prev => {
            if (prev.termId === activeTerm.id) return prev;
            return { ...prev, termId: activeTerm.id };
        });
    }
  }, [activeTerm?.id, classInfo.id]);

  useEffect(() => {
    return () => {
      Object.values(cellStatusTimersRef.current).forEach((timer) => clearTimeout(timer));
      cellStatusTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (resolvedAssessments.length > 0 && visibleAssessmentIds.length === 0) {
        setVisibleAssessmentIds(resolvedAssessments.map(a => a.id));
    }
  }, [resolvedAssessments, visibleAssessmentIds.length]);

  const handleTermChange = useCallback((termId: string) => {
    const term = terms.find(t => t.id === termId);
    if (term) setActiveTerm(term);
  }, [terms, setActiveTerm]);

  const persistMark = useCallback(async (
    assessmentId: string,
    learnerId: string,
    value: string,
    previousValue: string
  ) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return;
    }
    const key = `${assessmentId}::${learnerId}`;
    if (markSaveInFlightRef.current[key] === value) return;
    const nextSeq = (markSaveSequenceRef.current[key] || 0) + 1;
    markSaveSequenceRef.current[key] = nextSeq;
    markSaveInFlightRef.current[key] = value;
    pendingMarkSaveCountRef.current += 1;
    setIsAutoSaving(true);
    clearCellStatusTimer(key);
    setCellSaveStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
        const score = value === "" ? null : parseFloat(value);
        const existingMark = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        
        const result = await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score,
            comment: editedComments[key] || existingMark?.comment || ""
        }]);
        if (!result?.success) {
            throw new Error(result?.message || "Failed to save mark.");
        }
        
        setEditedMarks(prev => {
            if (markSaveSequenceRef.current[key] !== nextSeq) return prev;
            if (prev[key] === value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return prev;
        });
        setCellSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
        setSaveSuccessTick((prev) => prev + 1);
        scheduleCellStatusReset(key, 'saved', 1600);
    } catch (e) {
        logAdminLessError('marksheet_mark_persist', e);
        if (markSaveSequenceRef.current[key] === nextSeq) {
            setEditedMarks(prev => {
                if (prev[key] !== value) return prev;
                return { ...prev, [key]: previousValue };
            });
            setCellSaveStatus(prev => ({ ...prev, [key]: 'error' }));
            scheduleCellStatusReset(key, 'error', 2200);
            showError("Failed to save mark.");
        }
    } finally {
        if (markSaveSequenceRef.current[key] === nextSeq) {
            delete markSaveInFlightRef.current[key];
        }
        pendingMarkSaveCountRef.current = Math.max(0, pendingMarkSaveCountRef.current - 1);
        if (pendingMarkSaveCountRef.current === 0) {
            setIsAutoSaving(false);
        }
    }
  }, [updateMarks, editedComments, resolvedMarks, clearCellStatusTimer, scheduleCellStatusReset, sheetLocked]);

  const validateAndCommitMark = useCallback(async (assessmentId: string, learnerId: string, input: string) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return false;
    }
    const assessment = resolvedAssessments.find(a => a.id === assessmentId);
    if (!assessment) return false;

    const result = validateMarkEntry(input, assessment.max_mark);

    if (!result.isValid) {
        showError(result.error || "Invalid mark");
        setEditedMarks(prev => ({ ...prev, [`${assessmentId}::${learnerId}`]: "" }));
        return false;
    }

    if (result.isFraction) {
        showSuccess(`Calculated: ${input} = ${result.value}`);
    }

    const key = `${assessmentId}::${learnerId}`;
    const persistedScore = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId)?.score;
    const persistedValue = persistedScore === null || persistedScore === undefined ? "" : persistedScore.toString();

    if (persistedValue === result.value) {
        setEditedMarks(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
        return true;
    }

    setEditedMarks(prev => ({ ...prev, [key]: result.value }));
    persistMark(assessmentId, learnerId, result.value, persistedValue);
    return true;
  }, [resolvedAssessments, persistMark, resolvedMarks, sheetLocked]);

  const handleMarkChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return;
    }
    setEditedMarks(prev => ({ ...prev, [`${assessmentId}::${learnerId}`]: value }));
  }, [sheetLocked]);

  const visibleAssessments = useMemo(() => resolvedAssessments.filter(a => visibleAssessmentIds.includes(a.id)), [resolvedAssessments, visibleAssessmentIds]);

  const calculateLearnerTotal = useCallback((learnerId: string) => {
      const targetAssessments = recalculateTotal ? visibleAssessments : resolvedAssessments;
      
      const combinedMarksMap = new Map();
      resolvedMarks.filter(m => m.learner_id === learnerId).forEach(m => combinedMarksMap.set(m.assessment_id, m.score));
      
      Object.entries(editedMarks).forEach(([key, val]) => {
          const [assId, lId] = key.split('::');
          if (lId === learnerId) {
              combinedMarksMap.set(assId, val === "" ? null : parseFloat(val));
          }
      });

      const processedMarks = Array.from(combinedMarksMap.entries()).map(([assId, score]) => ({
          assessment_id: assId,
          learner_id: learnerId,
          score,
          id: ''
      }));
      
      const result = calculateWeightedAverage(targetAssessments, processedMarks, learnerId);
      return formatDisplayMark(result);
  }, [recalculateTotal, visibleAssessments, resolvedAssessments, editedMarks, resolvedMarks]);

  const sortedAndFilteredLearners = useMemo(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();
    const filtered = classInfo.learners.filter(l => l.name.toLowerCase().includes(normalizedSearch));
    return filtered.sort((a, b) => {
        if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        return 0;
    });
  }, [classInfo.learners, debouncedSearchQuery, sortConfig]);

  const handleCommentChange = useCallback(async (assessmentId: string, learnerId: string, value: string) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return;
    }
    const key = `${assessmentId}::${learnerId}`;
    setEditedComments(prev => ({ ...prev, [key]: value }));
    
    setIsAutoSaving(true);
    clearCellStatusTimer(key);
    setCellSaveStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
        const mark = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        const result = await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score: mark?.score ?? null,
            comment: value
        }]);
        if (!result?.success) {
            throw new Error(result?.message || "Failed to save note.");
        }
        
        setEditedComments(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setCellSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
        setSaveSuccessTick((prev) => prev + 1);
        scheduleCellStatusReset(key, 'saved', 1600);
    } catch (error) {
        logAdminLessError('marksheet_comment_persist', error);
        setCellSaveStatus(prev => ({ ...prev, [key]: 'error' }));
        scheduleCellStatusReset(key, 'error', 2200);
        showError("Failed to save note.");
    } finally {
        setIsAutoSaving(false);
    }
  }, [updateMarks, resolvedMarks, clearCellStatusTimer, scheduleCellStatusReset, sheetLocked]);

  const handleAddAssessment = useCallback(async () => {
      if (sheetLocked) {
        console.warn("[marks] blocked edit on locked term");
        return;
      }
      const targetTermId = newAss.termId || activeTerm?.id;
      if (!targetTermId || targetTermId === 'undefined') {
          showError("Target term missing.");
          setIsAddOpen(false);
          return;
      }
      
      try {
          await createAssessment({ 
              title: newAss.title,
              type: newAss.type,
              date: newAss.date || new Date().toISOString(),
              class_id: classInfo.id, 
              term_id: targetTermId, 
              max_mark: Number(newAss.max), 
              weight: Number(newAss.weight), 
              rubric_id: newAss.rubricId === 'none' ? null : (newAss.rubricId || null),
              questions: newAss.questions
          });
          
          setNewAss({ 
              title: "", 
              type: "Test", 
              max: 50, 
              weight: 10, 
              date: "", 
              rubricId: "", 
              termId: activeTerm?.id || "", 
              questions: [] 
          });
      } finally {
          setIsAddOpen(false);
      }
  }, [newAss, activeTerm, classInfo.id, createAssessment, sheetLocked]);

  const reorderAssessments = useCallback(async (payload: { id: string; position: number }[], termId: string) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return;
    }
    const scopedAssessments = resolvedAssessments.filter(
      (assessment) => assessment.class_id === classInfo.id && assessment.term_id === termId
    );

    if (scopedAssessments.length === 0) return;

    const validScopedIds = new Set(scopedAssessments.map((assessment) => assessment.id));
    const sanitizedPayload = payload
      .filter((item) => validScopedIds.has(item.id))
      .map((item) => ({ id: item.id, position: item.position }));

    if (sanitizedPayload.length !== scopedAssessments.length) {
      throw new Error("Invalid reorder payload: all current class/term assessments must be included.");
    }

    const uniquePositions = new Set(sanitizedPayload.map((item) => item.position));
    if (uniquePositions.size !== sanitizedPayload.length) {
      throw new Error("Invalid reorder payload: duplicate positions are not allowed.");
    }

    const orderedPositions = [...uniquePositions].sort((a, b) => a - b);
    const isContiguous = orderedPositions.every((position, index) => position === index + 1);
    if (!isContiguous) {
      throw new Error("Invalid reorder payload: positions must be sequential without gaps.");
    }

    setIsReorderingAssessments(true);
    const rollbackOptimisticOrder = optimisticReorderAssessments(classInfo.id, termId, sanitizedPayload);
    try {
      const { error } = await supabase.rpc("reorder_assessments", {
        payload: sanitizedPayload,
        target_class_id: classInfo.id,
        target_term_id: termId,
      });

      if (error) throw error;
    } catch (error) {
      rollbackOptimisticOrder();
      throw error;
    } finally {
      setIsReorderingAssessments(false);
    }
  }, [resolvedAssessments, classInfo.id, optimisticReorderAssessments, sheetLocked]);

  const undoLastReorder = useCallback(async (termId: string) => {
    if (sheetLocked) {
      console.warn("[marks] blocked edit on locked term");
      return;
    }
    const { data, error } = await supabase
      .from("assessment_reorder_log")
      .select("payload")
      .eq("class_id", classInfo.id)
      .eq("term_id", termId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data?.payload || !Array.isArray(data.payload)) {
      throw new Error("No reorder history found for this class and term.");
    }

    const payload = data.payload
      .filter((entry: any) => entry && typeof entry.id === "string" && typeof entry.position === "number")
      .map((entry: any) => ({ id: entry.id, position: entry.position }));

    if (payload.length === 0) {
      throw new Error("Latest reorder history entry is empty.");
    }

    await reorderAssessments(payload, termId);
  }, [classInfo.id, reorderAssessments, sheetLocked]);

  const actions = useMemo(() => ({
      setViewTermId: handleTermChange, 
      setIsAddOpen, setIsEditOpen, setIsImportOpen, setIsCopyOpen, setAnalyticsOpen,
      setNewAss, setEditingAssessment, setSearchQuery, setSelectedAssessment, setRecalculateTotal,
      getMarkValue: (a: string, l: string) => editedMarks[`${a}::${l}`] ?? resolvedMarks.find(m => m.assessment_id === a && m.learner_id === l)?.score?.toString() ?? "",
      getMarkComment: (a: string, l: string) => editedComments[`${a}::${l}`] ?? resolvedMarks.find(m => m.assessment_id === a && m.learner_id === l)?.comment ?? "",
      handleMarkChange, 
      handleCommentChange,
      handleAddAssessment,
      reorderAssessments,
      undoLastReorder,
      handleUpdateAssessment: async (assessment: Assessment) => {
        if (sheetLocked) {
          console.warn("[marks] blocked edit on locked term");
          return;
        }
        await updateAssessment(assessment);
        setIsEditOpen(false);
      },
      calculateLearnerTotal,
      getAssessmentStats: (id: string) => {
          const assMarks = resolvedMarks.filter(m => m.assessment_id === id && m.score !== null);
          const ass = resolvedAssessments.find(a => a.id === id);
          if (!assMarks.length || !ass) return { avg: '0', max: 0, min: 0 };
          const pcts = assMarks.map(m => (m.score! / ass.max_mark) * 100);
          return { avg: (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1), max: Math.max(...pcts).toFixed(0), min: Math.min(...pcts).toFixed(0) };
      },
      openAnalytics: (ass: Assessment) => { setSelectedAssessment(ass); setAnalyticsOpen(true); },
      toggleAssessmentVisibility: (id: string) => setVisibleAssessmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
      deleteAssessment: async (id: string) => {
        if (sheetLocked) {
          console.warn("[marks] blocked edit on locked term");
          return;
        }
        await deleteAssessment(id);
      }, 
      refreshAssessments, 
      handleSort: (key: string) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' })),
      openTool: (type: 'rapid' | 'voice', id: string) => setActiveTool({ type, assessmentId: id, termId: resolvedAssessments.find(a => a.id === id)?.term_id || null }),
      closeTool: () => setActiveTool({ type: null, assessmentId: null, termId: null }),
      handleToolUpdate: (idx: number, val: string) => { 
          if(activeTool.assessmentId && sortedAndFilteredLearners[idx]?.id) {
              validateAndCommitMark(activeTool.assessmentId, sortedAndFilteredLearners[idx].id!, val);
          }
      },
      validateAndCommitMark,
      setRubricMarkingOpen: (open: boolean) => setRubricMarking(prev => ({ ...prev, open })),
      handleBulkColumnUpdate: async (assessmentId: string, value: string) => {
          if (sheetLocked) {
              console.warn("[marks] blocked edit on locked term");
              return { success: false as const, message: "This class or term is locked." };
          }
          const updates = classInfo.learners.filter(l => l.id).map(l => ({
              assessment_id: assessmentId,
              learner_id: l.id!,
              score: value === "" ? null : parseFloat(value)
          }));
          if (updates.length > 0) return await updateMarks(updates);
          return { success: true as const };
      },
      handleApplyModeration: async (assessmentId: string, adjustment: number) => {
          if (sheetLocked) {
              console.warn("[marks] blocked edit on locked term");
              return;
          }
          const ass = resolvedAssessments.find(a => a.id === assessmentId);
          if (!ass) return;

          const updates = classInfo.learners
            .filter(l => l.id)
            .map(l => {
                const current = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === l.id);
                if (!current || current.score === null) return null;
                
                // Add % adjustment to the current score
                const currentPct = (current.score / ass.max_mark) * 100;
                const newPct = Math.min(100, Math.max(0, currentPct + adjustment));
                const newScore = parseFloat(((newPct / 100) * ass.max_mark).toFixed(1));
                
                return {
                    assessment_id: assessmentId,
                    learner_id: l.id!,
                    score: newScore
                };
            })
            .filter(Boolean) as any[];

          if (updates.length > 0) {
              const result = await updateMarks(updates);
              if (result?.success) {
                showSuccess(`Applied ${adjustment > 0 ? '+' : ''}${adjustment}% adjustment to all marks.`);
              }
          }
      },
      handleBulkImport: async (assessmentId: string, updates: { learnerId: string; score: number }[]) => {
          if (sheetLocked) {
              console.warn("[marks] blocked edit on locked term");
              throw new Error("This class or term is locked.");
          }
          const result = await updateMarks(updates.map(u => ({ assessment_id: assessmentId, learner_id: u.learnerId, score: u.score })));
          if (!result?.success) {
            throw new Error(result?.message || "Failed to save imported marks.");
          }
      },
      openRubricForLearner: (assessmentId: string, learner: Learner) => {
          const assessment = resolvedAssessments.find(a => a.id === assessmentId);
          const rubric = availableRubrics.find(r => r.id === assessment?.rubric_id);
          if (rubric) setRubricMarking({ open: true, rubric, learner, assessmentId });
      },
      handleRubricSave: async (score: number, selections: Record<string, string>) => {
          if (sheetLocked) {
              console.warn("[marks] blocked edit on locked term");
              return { success: false as const, message: "This class or term is locked." };
          }
          if (rubricMarking.assessmentId && rubricMarking.learner?.id) {
              return await updateMarks([{ assessment_id: rubricMarking.assessmentId, learner_id: rubricMarking.learner.id, score, rubric_selections: selections } as any]);
          }
          return { success: false as const, message: "Nothing to save." };
      },
      handleNextRubric: () => {
          const idx = sortedAndFilteredLearners.findIndex(l => l.id === rubricMarking.learner?.id);
          if (idx < sortedAndFilteredLearners.length - 1) setRubricMarking(p => ({ ...p, learner: sortedAndFilteredLearners[idx + 1] }));
      },
      handlePrevRubric: () => {
          const idx = sortedAndFilteredLearners.findIndex(l => l.id === rubricMarking.learner?.id);
          if (idx > 0) setRubricMarking(p => ({ ...p, learner: sortedAndFilteredLearners[idx - 1] }));
      },
      updateMarks: async (...args: Parameters<typeof updateMarks>) => {
          if (sheetLocked) {
              console.warn("[marks] blocked edit on locked term");
              return { success: false as const, message: "This class or term is locked." };
          }
          return updateMarks(...args);
      }
  }), [
    handleTermChange, handleMarkChange, handleCommentChange, handleAddAssessment, 
    updateAssessment, calculateLearnerTotal, resolvedMarks, resolvedAssessments, deleteAssessment, 
    refreshAssessments, activeTool, sortedAndFilteredLearners, validateAndCommitMark, 
    classInfo.learners, updateMarks, availableRubrics, rubricMarking, reorderAssessments, undoLastReorder, sheetLocked
  ]);

  return {
    state: {
      viewTermId: activeTerm?.id || null, 
      isAddOpen, isEditOpen, isImportOpen, isCopyOpen, analyticsOpen,
      newAss, editingAssessment, editedMarks, editedComments, searchQuery, selectedAssessment,
      visibleAssessmentIds, recalculateTotal, currentViewTerm: activeTerm, visibleAssessments,
      isLocked: sheetLocked,
      filteredLearners: sortedAndFilteredLearners,
      assessments: resolvedAssessments, marks: resolvedMarks, terms, activeTerm, activeYear,
      atRiskThreshold, sortConfig, activeTool, 
      currentTotalWeight: resolvedAssessments.reduce((acc, a) => acc + (a.weight || 0), 0),
      isWeightValid: resolvedAssessments.reduce((acc, a) => acc + (a.weight || 0), 0) === 100, 
      isUsingVisibleTotal: recalculateTotal,
      isAutoSaving, availableRubrics, rubricMarking,
      saveSuccessTick,
      cellSaveStatus,
      isReorderingAssessments,
      activeAssessmentMax: resolvedAssessments.find(a => a.id === activeTool.assessmentId)?.max_mark,
      learnersForTools: sortedAndFilteredLearners.map(l => ({
          ...l,
          mark: l.id ? editedMarks[`${activeTool.assessmentId}::${l.id}`] || (resolvedMarks.find(m => m.assessment_id === activeTool.assessmentId && m.learner_id === l.id)?.score?.toString() || "") : ""
      }))
    },
    actions
  };
};