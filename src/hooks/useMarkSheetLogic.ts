import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { Learner, ClassInfo, Assessment, Rubric, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { validateMarkEntry } from '@/utils/integrity';
import { supabase } from "@/lib/supabaseClient";


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
      console.error("Rubrics fetch error:", error);
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
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [editedComments, setEditedComments] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const markSaveSequenceRef = useRef<Record<string, number>>({});
  const markSaveInFlightRef = useRef<Record<string, string>>({});
  const pendingMarkSaveCountRef = useRef(0);

  // STABILISATION: Sync assessments only when essential dependencies change
  useEffect(() => {
    if (activeTerm?.id && classInfo.id && activeTerm.id !== 'undefined') {
        refreshAssessments(classInfo.id, activeTerm.id);
        setNewAss(prev => {
            if (prev.termId === activeTerm.id) return prev;
            return { ...prev, termId: activeTerm.id };
        });
    }
  }, [activeTerm?.id, classInfo.id, refreshAssessments]);

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
    const key = `${assessmentId}::${learnerId}`;
    if (markSaveInFlightRef.current[key] === value) return;
    const nextSeq = (markSaveSequenceRef.current[key] || 0) + 1;
    markSaveSequenceRef.current[key] = nextSeq;
    markSaveInFlightRef.current[key] = value;
    pendingMarkSaveCountRef.current += 1;
    setIsAutoSaving(true);
    try {
        const score = value === "" ? null : parseFloat(value);
        const existingMark = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        
        await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score,
            comment: editedComments[key] || existingMark?.comment || ""
        }]);
        
        setEditedMarks(prev => {
            if (markSaveSequenceRef.current[key] !== nextSeq) return prev;
            if (prev[key] === value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return prev;
        });
    } catch (e) {
        console.error("Persistence failed:", e);
        if (markSaveSequenceRef.current[key] === nextSeq) {
            setEditedMarks(prev => {
                if (prev[key] !== value) return prev;
                return { ...prev, [key]: previousValue };
            });
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
  }, [updateMarks, editedComments, resolvedMarks]);

  const validateAndCommitMark = useCallback(async (assessmentId: string, learnerId: string, input: string) => {
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
  }, [resolvedAssessments, persistMark, resolvedMarks]);

  const handleMarkChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (activeYear?.closed || activeTerm?.closed) return;
    setEditedMarks(prev => ({ ...prev, [`${assessmentId}::${learnerId}`]: value }));
  }, [activeYear?.closed, activeTerm?.closed]);

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
    const filtered = classInfo.learners.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered.sort((a, b) => {
        if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        return 0;
    });
  }, [classInfo.learners, searchQuery, sortConfig]);

  const handleCommentChange = useCallback(async (assessmentId: string, learnerId: string, value: string) => {
    setEditedComments(prev => ({ ...prev, [`${assessmentId}::${learnerId}`]: value }));
    
    setIsAutoSaving(true);
    try {
        const mark = resolvedMarks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score: mark?.score ?? null,
            comment: value
        }]);
        
        setEditedComments(prev => {
            const next = { ...prev };
            delete next[`${assessmentId}::${learnerId}`];
            return next;
        });
    } finally {
        setIsAutoSaving(false);
    }
  }, [updateMarks, resolvedMarks]);

  const handleAddAssessment = useCallback(async () => {
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
  }, [newAss, activeTerm, classInfo.id, createAssessment]);

  const actions = useMemo(() => ({
      setViewTermId: handleTermChange, 
      setIsAddOpen, setIsEditOpen, setIsImportOpen, setIsCopyOpen, setAnalyticsOpen,
      setNewAss, setEditingAssessment, setSearchQuery, setSelectedAssessment, setRecalculateTotal,
      getMarkValue: (a: string, l: string) => editedMarks[`${a}::${l}`] ?? resolvedMarks.find(m => m.assessment_id === a && m.learner_id === l)?.score?.toString() ?? "",
      getMarkComment: (a: string, l: string) => editedComments[`${a}::${l}`] ?? resolvedMarks.find(m => m.assessment_id === a && m.learner_id === l)?.comment ?? "",
      handleMarkChange, 
      handleCommentChange,
      handleAddAssessment,
      handleUpdateAssessment: async (assessment: Assessment) => {
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
      deleteAssessment, 
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
          const updates = classInfo.learners.filter(l => l.id).map(l => ({
              assessment_id: assessmentId,
              learner_id: l.id!,
              score: value === "" ? null : parseFloat(value)
          }));
          if (updates.length > 0) await updateMarks(updates);
      },
      handleApplyModeration: async (assessmentId: string, adjustment: number) => {
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
              await updateMarks(updates);
              showSuccess(`Applied ${adjustment > 0 ? '+' : ''}${adjustment}% adjustment to all marks.`);
          }
      },
      handleBulkImport: (assessmentId: string, updates: { learnerId: string; score: number }[]) => {
          updateMarks(updates.map(u => ({ assessment_id: assessmentId, learner_id: u.learnerId, score: u.score })));
      },
      openRubricForLearner: (assessmentId: string, learner: Learner) => {
          const assessment = resolvedAssessments.find(a => a.id === assessmentId);
          const rubric = availableRubrics.find(r => r.id === assessment?.rubric_id);
          if (rubric) setRubricMarking({ open: true, rubric, learner, assessmentId });
      },
      handleRubricSave: async (score: number, selections: Record<string, string>) => {
          if (rubricMarking.assessmentId && rubricMarking.learner?.id) {
              await updateMarks([{ assessment_id: rubricMarking.assessmentId, learner_id: rubricMarking.learner.id, score, rubric_selections: selections } as any]);
          }
      },
      handleNextRubric: () => {
          const idx = sortedAndFilteredLearners.findIndex(l => l.id === rubricMarking.learner?.id);
          if (idx < sortedAndFilteredLearners.length - 1) setRubricMarking(p => ({ ...p, learner: sortedAndFilteredLearners[idx + 1] }));
      },
      handlePrevRubric: () => {
          const idx = sortedAndFilteredLearners.findIndex(l => l.id === rubricMarking.learner?.id);
          if (idx > 0) setRubricMarking(p => ({ ...p, learner: sortedAndFilteredLearners[idx - 1] }));
      },
      updateMarks 
  }), [
    handleTermChange, handleMarkChange, handleCommentChange, handleAddAssessment, 
    updateAssessment, calculateLearnerTotal, resolvedMarks, resolvedAssessments, deleteAssessment, 
    refreshAssessments, activeTool, sortedAndFilteredLearners, validateAndCommitMark, 
    classInfo.learners, updateMarks, availableRubrics, rubricMarking
  ]);

  return {
    state: {
      viewTermId: activeTerm?.id || null, 
      isAddOpen, isEditOpen, isImportOpen, isCopyOpen, analyticsOpen,
      newAss, editingAssessment, editedMarks, editedComments, searchQuery, selectedAssessment,
      visibleAssessmentIds, recalculateTotal, currentViewTerm: activeTerm, visibleAssessments,
      isLocked: activeYear?.closed || activeTerm?.closed, 
      filteredLearners: sortedAndFilteredLearners,
      assessments: resolvedAssessments, marks: resolvedMarks, terms, activeTerm, activeYear,
      atRiskThreshold, sortConfig, activeTool, 
      currentTotalWeight: resolvedAssessments.reduce((acc, a) => acc + (a.weight || 0), 0),
      isWeightValid: resolvedAssessments.reduce((acc, a) => acc + (a.weight || 0), 0) === 100, 
      isUsingVisibleTotal: recalculateTotal,
      isAutoSaving, availableRubrics, rubricMarking,
      activeAssessmentMax: resolvedAssessments.find(a => a.id === activeTool.assessmentId)?.max_mark,
      learnersForTools: sortedAndFilteredLearners.map(l => ({
          ...l,
          mark: l.id ? editedMarks[`${activeTool.assessmentId}::${l.id}`] || (resolvedMarks.find(m => m.assessment_id === activeTool.assessmentId && m.learner_id === l.id)?.score?.toString() || "") : ""
      }))
    },
    actions
  };
};