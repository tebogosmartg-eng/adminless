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
    deleteAssessment, 
    refreshAssessments,
    updateMarks
  } = useAcademic();

  const { atRiskThreshold } = useSettings();
  const availableRubrics = useLiveQuery(() => db.rubrics.toArray()) || [];

  // UI state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const [rubricMarking, setRubricMarking] = useState<{ 
    open: boolean; 
    rubric: Rubric | null; 
    learner: Learner | null; 
    assessmentId: string | null 
  }>({ open: false, rubric: null, learner: null, assessmentId: null });

  const [activeTool, setActiveTool] = useState<{ type: 'rapid' | 'voice' | null, assessmentId: string | null }>({ type: null, assessmentId: null });
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "", rubricId: "" });
  
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [editedComments, setEditedComments] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // Sync the academic data layer with current class and global active term
  useEffect(() => {
    if (activeTerm?.id) {
        refreshAssessments(classInfo.id, activeTerm.id);
        // Clear buffers when context changes
        setEditedMarks({}); 
        setEditedComments({});
    }
  }, [activeTerm?.id, classInfo.id]);

  useEffect(() => {
    setVisibleAssessmentIds(assessments.map(a => a.id));
  }, [assessments]);

  // Handle term switching globally
  const handleTermChange = (termId: string) => {
    const term = terms.find(t => t.id === termId);
    if (term) setActiveTerm(term);
  };

  const persistMark = useCallback(async (assessmentId: string, learnerId: string, value: string) => {
    setIsAutoSaving(true);
    try {
        const score = value === "" ? null : parseFloat(value);
        const existingMark = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
        
        await updateMarks([{ 
            assessment_id: assessmentId, 
            learner_id: learnerId, 
            score,
            comment: editedComments[`${assessmentId}-${learnerId}`] || existingMark?.comment || ""
        }]);
        
        setEditedMarks(prev => {
            const next = { ...prev };
            delete next[`${assessmentId}-${learnerId}`];
            return next;
        });
    } catch (e) {
        console.error("Auto-save failed", e);
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
        showSuccess(`Processed formula: ${input} = ${result.value}`);
    }

    setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: result.value }));
    await persistMark(assessmentId, learnerId, result.value);
    return true;
  }, [assessments, persistMark]);

  const handleMarkChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (activeYear?.closed || activeTerm?.closed) return;
    setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  }, [activeYear?.closed, activeTerm?.closed]);

  const visibleAssessments = useMemo(() => assessments.filter(a => visibleAssessmentIds.includes(a.id)), [assessments, visibleAssessmentIds]);

  const activeAssessmentMax = useMemo(() => 
    assessments.find(a => a.id === activeTool.assessmentId)?.max_mark,
  [assessments, activeTool.assessmentId]);

  const currentTotalWeight = useMemo(() => {
    const target = recalculateTotal ? visibleAssessments : assessments;
    return target.reduce((acc, a) => acc + (a.weight || 0), 0);
  }, [assessments, visibleAssessments, recalculateTotal]);

  const isWeightValid = useMemo(() => currentTotalWeight === 100, [currentTotalWeight]);

  const calculateLearnerTotal = useCallback((learnerId: string) => {
      const targetAssessments = recalculateTotal ? visibleAssessments : assessments;
      const combinedMarks = [...marks];
      
      Object.entries(editedMarks).forEach(([key, val]) => {
          const [assId, lId] = key.split('-');
          if (lId === learnerId) {
              const idx = combinedMarks.findIndex(m => m.assessment_id === assId && m.learner_id === learnerId);
              const entry = { assessment_id: assId, learner_id: lId, score: val === "" ? null : parseFloat(val), id: '' };
              if (idx !== -1) combinedMarks[idx] = entry;
              else combinedMarks.push(entry);
          }
      });
      
      const result = calculateWeightedAverage(targetAssessments, combinedMarks, learnerId);
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

  return {
    state: {
      viewTermId: activeTerm?.id || null, 
      isAddOpen, isImportOpen, isCopyOpen, analyticsOpen,
      newAss, editedMarks, editedComments, searchQuery, selectedAssessment,
      visibleAssessmentIds, recalculateTotal, currentViewTerm: activeTerm, visibleAssessments,
      isLocked: activeYear?.closed || activeTerm?.closed, 
      filteredLearners: sortedAndFilteredLearners,
      assessments, marks, terms, activeTerm, activeYear,
      atRiskThreshold, sortConfig, activeTool, 
      currentTotalWeight, isWeightValid, isUsingVisibleTotal: recalculateTotal,
      isAutoSaving, availableRubrics, rubricMarking,
      activeAssessmentMax,
      learnersForTools: sortedAndFilteredLearners.map(l => ({ ...l, mark: l.id ? editedMarks[`${activeTool.assessmentId}-${l.id}`] || (marks.find(m => m.assessment_id === activeTool.assessmentId && m.learner_id === l.id)?.score?.toString() || "") : "" }))
    },
    actions: {
      setViewTermId: handleTermChange, 
      setIsAddOpen, setIsImportOpen, setIsCopyOpen, setAnalyticsOpen,
      setNewAss, setSearchQuery, setSelectedAssessment, setRecalculateTotal,
      getMarkValue: (a, l) => editedMarks[`${a}-${l}`] ?? marks.find(m => m.assessment_id === a && m.learner_id === l)?.score?.toString() ?? "",
      getMarkComment: (a, l) => editedComments[`${a}-${l}`] ?? marks.find(m => m.assessment_id === a && m.learner_id === l)?.comment ?? "",
      handleMarkChange, 
      handleCommentChange,
      handleSaveMarks: () => {}, 
      handleAddAssessment: async () => {
          if (!activeTerm) return;
          await createAssessment({ ...newAss, class_id: classInfo.id, term_id: activeTerm.id, max_mark: Number(newAss.max), weight: Number(newAss.weight), rubric_id: newAss.rubricId || null });
          setIsAddOpen(false);
      },
      calculateLearnerTotal,
      getAssessmentStats: (id) => {
          const assMarks = marks.filter(m => m.assessment_id === id && m.score !== null);
          const ass = assessments.find(a => a.id === id);
          if (!assMarks.length || !ass) return { avg: '0', max: 0, min: 0 };
          const pcts = assMarks.map(m => (m.score! / ass.max_mark) * 100);
          return { avg: (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1), max: Math.max(...pcts).toFixed(0), min: Math.min(...pcts).toFixed(0) };
      },
      openAnalytics: (ass) => { setSelectedAssessment(ass); setAnalyticsOpen(true); },
      handleExportSheet: () => {}, 
      toggleAssessmentVisibility: (id) => setVisibleAssessmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
      deleteAssessment, 
      refreshAssessments, 
      handleSort: (key) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' })),
      openTool: (type, id) => setActiveTool({ type, assessmentId: id }),
      closeTool: () => setActiveTool({ type: null, assessmentId: null }),
      handleToolUpdate: (idx, val) => { 
          if(activeTool.assessmentId && sortedAndFilteredLearners[idx]?.id) validateAndCommitMark(activeTool.assessmentId, sortedAndFilteredLearners[idx].id!, val);
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
      }
    }
  };
};