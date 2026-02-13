import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { Learner, ClassInfo, Assessment, Rubric, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage, formatDisplayMark } from '@/utils/calculations';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { validateMarkEntry } from '@/utils/integrity';

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
    updateMarks
  } = useAcademic();

  const { atRiskThreshold } = useSettings();
  const availableRubrics = useLiveQuery(() => db.rubrics.toArray()) || [];

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

  // STABILISATION: Sync assessments only when essential dependencies change
  useEffect(() => {
    if (activeTerm?.id && classInfo.id) {
        refreshAssessments(classInfo.id, activeTerm.id);
        setNewAss(prev => {
            if (prev.termId === activeTerm.id) return prev;
            return { ...prev, termId: activeTerm.id };
        });
    }
  }, [activeTerm?.id, classInfo.id, refreshAssessments]);

  useEffect(() => {
    if (assessments.length > 0 && visibleAssessmentIds.length === 0) {
        setVisibleAssessmentIds(assessments.map(a => a.id));
    }
  }, [assessments]);

  const handleTermChange = useCallback((termId: string) => {
    const term = terms.find(t => t.id === termId);
    if (term) setActiveTerm(term);
  }, [terms, setActiveTerm]);

  const persistMark = useCallback(async (assessmentId: string, learnerId: string, value: string) => {
    setIsAutoSaving(true);
    const key = `${assessmentId}-${learnerId}`;
    try {
        const score = value === "" ? null : parseFloat(value);
        const existingMark = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        
        await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score,
            comment: editedComments[key] || existingMark?.comment || "",
            question_marks: existingMark?.question_marks || []
        }]);
        
        setEditedMarks(prev => {
            if (prev[key] === value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return prev;
        });
    } catch (e) {
        console.error("Persistence failed:", e);
        showError("Failed to save mark.");
    } finally {
        setIsAutoSaving(false);
    }
  }, [updateMarks, editedComments, marks]);

  const validateAndCommitMark = useCallback(async (assessmentId: string, learnerId: string, input: string) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return false;

    const result = validateMarkEntry(input, assessment.max_mark);

    if (!result.isValid) {
        showError(result.error || "Invalid mark");
        setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: "" }));
        return false;
    }

    if (result.isFraction) {
        showSuccess(`Calculated: ${input} = ${result.value}`);
    }

    setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: result.value }));
    persistMark(assessmentId, learnerId, result.value);
    return true;
  }, [assessments, persistMark]);

  const handleMarkChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (activeYear?.closed || activeTerm?.closed) return;
    setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  }, [activeYear?.closed, activeTerm?.closed]);

  const visibleAssessments = useMemo(() => assessments.filter(a => visibleAssessmentIds.includes(a.id)), [assessments, visibleAssessmentIds]);

  const calculateLearnerTotal = useCallback((learnerId: string) => {
      const targetAssessments = recalculateTotal ? visibleAssessments : assessments;
      
      const combinedMarksMap = new Map();
      marks.filter(m => m.learner_id === learnerId).forEach(m => combinedMarksMap.set(m.assessment_id, m.score));
      
      Object.entries(editedMarks).forEach(([key, val]) => {
          const [assId, lId] = key.split('-');
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
  }, [recalculateTotal, visibleAssessments, assessments, editedMarks, marks]);

  const sortedAndFilteredLearners = useMemo(() => {
    const filtered = classInfo.learners.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered.sort((a, b) => {
        if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        return 0;
    });
  }, [classInfo.learners, searchQuery, sortConfig]);

  const handleCommentChange = useCallback(async (assessmentId: string, learnerId: string, value: string) => {
    setEditedComments(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
    
    setIsAutoSaving(true);
    try {
        const mark = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score: mark?.score ?? null,
            comment: value
        }]);
        
        setEditedComments(prev => {
            const next = { ...prev };
            delete next[`${assessmentId}-${learnerId}`];
            return next;
        });
    } finally {
        setIsAutoSaving(false);
    }
  }, [updateMarks, marks]);

  const handleAddAssessment = useCallback(async () => {
      const targetTermId = newAss.termId || activeTerm?.id;
      if (!targetTermId) return showError("Target term missing.");
      await createAssessment({ 
          ...newAss, 
          class_id: classInfo.id, 
          term_id: targetTermId, 
          max_mark: Number(newAss.max), 
          weight: Number(newAss.weight), 
          rubric_id: newAss.rubricId === 'none' ? null : (newAss.rubricId || null),
          questions: newAss.questions
      });
      setIsAddOpen(false);
  }, [newAss, activeTerm?.id, classInfo.id, createAssessment]);

  const actions = useMemo(() => ({
      setViewTermId: handleTermChange, 
      setIsAddOpen, setIsEditOpen, setIsImportOpen, setIsCopyOpen, setAnalyticsOpen,
      setNewAss, setEditingAssessment, setSearchQuery, setSelectedAssessment, setRecalculateTotal,
      getMarkValue: (a: string, l: string) => editedMarks[`${a}-${l}`] ?? marks.find(m => m.assessment_id === a && m.learner_id === l)?.score?.toString() ?? "",
      getMarkComment: (a: string, l: string) => editedComments[`${a}-${l}`] ?? marks.find(m => m.assessment_id === a && m.learner_id === l)?.comment ?? "",
      handleMarkChange, 
      handleCommentChange,
      handleAddAssessment,
      handleUpdateAssessment: async (assessment: Assessment) => {
        await updateAssessment(assessment);
        setIsEditOpen(false);
      },
      calculateLearnerTotal,
      getAssessmentStats: (id: string) => {
          const assMarks = marks.filter(m => m.assessment_id === id && m.score !== null);
          const ass = assessments.find(a => a.id === id);
          if (!assMarks.length || !ass) return { avg: '0', max: 0, min: 0 };
          const pcts = assMarks.map(m => (m.score! / ass.max_mark) * 100);
          return { avg: (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1), max: Math.max(...pcts).toFixed(0), min: Math.min(...pcts).toFixed(0) };
      },
      openAnalytics: (ass: Assessment) => { setSelectedAssessment(ass); setAnalyticsOpen(true); },
      handleExportSheet: () => {}, 
      toggleAssessmentVisibility: (id: string) => setVisibleAssessmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
      deleteAssessment, 
      refreshAssessments, 
      handleSort: (key: string) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' })),
      openTool: (type: 'rapid' | 'voice', id: string) => setActiveTool({ type, assessmentId: id, termId: assessments.find(a => a.id === id)?.term_id || null }),
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
      handleBulkImport: (assessmentId: string, updates: { learnerId: string; score: number }[]) => {
          updateMarks(updates.map(u => ({ assessment_id: assessmentId, learner_id: u.learnerId, score: u.score })));
      },
      openRubricForLearner: (assessmentId: string, learner: Learner) => {
          const assessment = assessments.find(a => a.id === assessmentId);
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
      updateMarks // Exposing for QuestionMarkingDialog use
  }), [
    handleTermChange, handleMarkChange, handleCommentChange, handleAddAssessment, 
    updateAssessment, calculateLearnerTotal, marks, assessments, deleteAssessment, 
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
      assessments, marks, terms, activeTerm, activeYear,
      atRiskThreshold, sortConfig, activeTool, 
      currentTotalWeight: assessments.reduce((acc, a) => acc + (a.weight || 0), 0),
      isWeightValid: assessments.reduce((acc, a) => acc + (a.weight || 0), 0) === 100, 
      isUsingVisibleTotal: recalculateTotal,
      isAutoSaving, availableRubrics, rubricMarking,
      activeAssessmentMax: assessments.find(a => a.id === activeTool.assessmentId)?.max_mark,
      learnersForTools: sortedAndFilteredLearners.map(l => ({
          ...l,
          mark: l.id ? editedMarks[`${activeTool.assessmentId}-${l.id}`] || (marks.find(m => m.assessment_id === activeTool.assessmentId && m.learner_id === l.id)?.score?.toString() || "") : ""
      }))
    },
    actions
  };
};