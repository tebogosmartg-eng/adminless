import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { Learner, ClassInfo, Assessment } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';

export const useMarkSheetLogic = (classInfo: ClassInfo) => {
  const { 
    terms,
    activeTerm, 
    activeYear,
    assessments, 
    marks, 
    createAssessment, 
    deleteAssessment, 
    refreshAssessments,
    updateMarks
  } = useAcademic();

  const { atRiskThreshold } = useSettings();

  const [viewTermId, setViewTermId] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const [activeTool, setActiveTool] = useState<{ type: 'rapid' | 'voice' | null, assessmentId: string | null }>({ type: null, assessmentId: null });
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [editedComments, setEditedComments] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    if (activeTerm && !viewTermId) {
        setViewTermId(activeTerm.id);
    }
  }, [activeTerm]);

  useEffect(() => {
    if (viewTermId) {
        refreshAssessments(classInfo.id, viewTermId);
        setEditedMarks({}); 
        setEditedComments({});
    }
  }, [viewTermId, classInfo.id]);

  useEffect(() => {
    setVisibleAssessmentIds(assessments.map(a => a.id));
  }, [assessments]);

  const getMarkValue = useCallback((assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) return editedMarks[key];
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.score?.toString() || "";
  }, [editedMarks, marks]);

  const getMarkComment = useCallback((assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedComments) return editedComments[key];
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.comment || "";
  }, [editedComments, marks]);

  const currentViewTerm = terms.find(t => t.id === viewTermId);
  
  const visibleAssessments = useMemo(() => 
    assessments.filter(a => visibleAssessmentIds.includes(a.id)), 
  [assessments, visibleAssessmentIds]);

  const totalWeight = useMemo(() => assessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [assessments]);
  const visibleWeight = useMemo(() => visibleAssessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [visibleAssessments]);
  
  const isUsingVisibleTotal = recalculateTotal && visibleAssessments.length !== assessments.length;
  const currentTotalWeight = isUsingVisibleTotal ? visibleWeight : totalWeight;
  const isWeightValid = currentTotalWeight === 100;
  
  const isLocked = activeYear?.closed || currentViewTerm?.closed || viewTermId !== activeTerm?.id;

  const calculateLearnerTotal = useCallback((learnerId: string) => {
      let weightedSum = 0;
      const targetAssessments = isUsingVisibleTotal ? visibleAssessments : assessments;
      
      targetAssessments.forEach(ass => {
          const val = getMarkValue(ass.id, learnerId);
          if (val !== "") {
              const score = parseFloat(val);
              const weighted = (score / ass.max_mark) * ass.weight;
              weightedSum += weighted;
          }
      });
      return weightedSum.toFixed(1);
  }, [isUsingVisibleTotal, visibleAssessments, assessments, getMarkValue]);

  const sortedAndFilteredLearners = useMemo(() => {
    const filtered = classInfo.learners.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (sortConfig.key === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else if (sortConfig.key === 'total') {
            valA = a.id ? parseFloat(calculateLearnerTotal(a.id)) : -1;
            valB = b.id ? parseFloat(calculateLearnerTotal(b.id)) : -1;
        } else {
            const rawA = a.id ? getMarkValue(sortConfig.key, a.id) : '';
            const rawB = b.id ? getMarkValue(sortConfig.key, b.id) : '';
            valA = rawA === '' ? -Infinity : parseFloat(rawA);
            valB = rawB === '' ? -Infinity : parseFloat(rawB);
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [classInfo.learners, searchQuery, sortConfig, calculateLearnerTotal, getMarkValue]);

  const handleMarkChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (isLocked) return;
    if (value !== "" && !value.includes('/')) {
        const assessment = assessments.find(a => a.id === assessmentId);
        if (assessment) {
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && numVal > assessment.max_mark) {
                showError(`Value ${numVal} exceeds the total of ${assessment.max_mark}.`);
                return; 
            }
        }
    }
    setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  }, [isLocked, assessments]);

  const handleCommentChange = useCallback((assessmentId: string, learnerId: string, value: string) => {
    if (isLocked) return;
    setEditedComments(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  }, [isLocked]);

  const handleSaveMarks = async () => {
      if (isLocked) {
          showError("Cannot save changes to a locked or inactive term.");
          return;
      }
      const keys = new Set([...Object.keys(editedMarks), ...Object.keys(editedComments)]);
      const updates = Array.from(keys).map(key => {
          const [assessmentId, learnerId] = key.split('-');
          let score: number | null = null;
          if (key in editedMarks) {
              const val = editedMarks[key];
              score = val === "" ? null : parseFloat(val);
          } else {
              const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
              score = m?.score ?? null;
          }
          let comment: string = "";
          if (key in editedComments) {
              comment = editedComments[key];
          } else {
              const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
              comment = m?.comment || "";
          }
          return { assessment_id: assessmentId, learner_id: learnerId, score, comment };
      });
      if (updates.length > 0) {
          await updateMarks(updates);
          setEditedMarks({});
          setEditedComments({});
          if (viewTermId) refreshAssessments(classInfo.id, viewTermId);
      }
  };

  const handleAddAssessment = async () => {
     if (isLocked) {
         showError("Assessment creation restricted to active terms only.");
         return;
     }
     try {
        await createAssessment({
            class_id: classInfo.id,
            term_id: viewTermId!,
            title: newAss.title,
            type: newAss.type,
            max_mark: Number(newAss.max),
            weight: Number(newAss.weight),
            date: newAss.date || new Date().toISOString()
        });
        setIsAddOpen(false);
        setNewAss({ title: "", type: "Test", max: 50, weight: 10, date: "" });
     } catch (e: any) {
        showError(e.message || "Failed to create assessment.");
     }
  };

  const handleExportSheet = () => {
    if (!classInfo) return;
    
    const headers = ["Learner Name", ...visibleAssessments.map(a => `${a.title} (${a.max_mark})`), "Term Total %"];
    const rows = sortedAndFilteredLearners.map(l => {
        const line = [l.name];
        visibleAssessments.forEach(ass => {
            line.push(getMarkValue(ass.id, l.id || ''));
        });
        line.push(calculateLearnerTotal(l.id || ''));
        return line;
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${classInfo.className}_Marksheet_${currentViewTerm?.name || 'Term'}.csv`;
    link.click();
    showSuccess("CSV Marksheet generated.");
  };

  return {
    state: {
      viewTermId, isAddOpen, isImportOpen, isCopyOpen, analyticsOpen,
      newAss, editedMarks, editedComments, searchQuery, selectedAssessment,
      visibleAssessmentIds, recalculateTotal, currentViewTerm, visibleAssessments,
      currentTotalWeight, isWeightValid, isLocked, filteredLearners: sortedAndFilteredLearners,
      isUsingVisibleTotal, assessments, marks, terms, activeTerm, activeYear,
      atRiskThreshold, sortConfig, activeTool, learnersForTools: sortedAndFilteredLearners.map(l => ({ ...l, mark: l.id ? getMarkValue(activeTool.assessmentId || '', l.id) : "" }))
    },
    actions: {
      setViewTermId, setIsAddOpen, setIsImportOpen, setIsCopyOpen, setAnalyticsOpen,
      setNewAss, setSearchQuery, setSelectedAssessment, setRecalculateTotal,
      getMarkValue, getMarkComment, handleMarkChange, handleCommentChange, handleBulkImport: (assId: string, imports: { learnerId: string; score: number }[]) => {
          const updates = imports.map(i => ({ assessment_id: assId, learner_id: i.learnerId, score: i.score }));
          updateMarks(updates);
      },
      handleBulkColumnUpdate: (assessmentId: string, val: string) => { 
          if (isLocked) return;
          const updates: { [key: string]: string } = {};
          classInfo.learners.forEach(l => { if (l.id) updates[`${assessmentId}-${l.id}`] = val; });
          setEditedMarks(prev => ({ ...prev, ...updates }));
      },
      handleSaveMarks, handleAddAssessment, calculateLearnerTotal,
      getAssessmentStats: (assessmentId: string) => { 
          const assessmentMarks = marks.filter(m => m.assessment_id === assessmentId && m.score !== null);
          const assessment = assessments.find(a => a.id === assessmentId);
          if (assessmentMarks.length === 0 || !assessment) return { avg: '0', max: 0, min: 0 };
          const scores = assessmentMarks.map(m => (m.score! / assessment.max_mark) * 100);
          return { avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1), max: Math.max(...scores).toFixed(0), min: Math.min(...scores).toFixed(0) };
      },
      openAnalytics: (ass: Assessment) => { setSelectedAssessment(ass); setAnalyticsOpen(true); },
      handleExportSheet,
      toggleAssessmentVisibility: (id: string) => setVisibleAssessmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
      deleteAssessment, refreshAssessments, handleSort: (key: string) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' })),
      openTool: (type: 'rapid' | 'voice', id: string) => setActiveTool({ type, assessmentId: id }),
      closeTool: () => setActiveTool({ type: null, assessmentId: null }),
      handleToolUpdate: (idx: number, val: string) => { 
          if(activeTool.assessmentId && sortedAndFilteredLearners[idx]?.id) {
              handleMarkChange(activeTool.assessmentId, sortedAndFilteredLearners[idx].id!, val); 
          }
      }
    }
  };
};