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
  
  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  // Data States
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  
  // Local state for edits
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [editedComments, setEditedComments] = useState<{ [key: string]: string }>({});
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // View Options State
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);

  // --- Effects ---

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

  // --- Derived State ---

  const currentViewTerm = terms.find(t => t.id === viewTermId);
  
  const visibleAssessments = useMemo(() => 
    assessments.filter(a => visibleAssessmentIds.includes(a.id)), 
  [assessments, visibleAssessmentIds]);

  const totalWeight = useMemo(() => assessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [assessments]);
  const visibleWeight = useMemo(() => visibleAssessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [visibleAssessments]);
  
  const isUsingVisibleTotal = recalculateTotal && visibleAssessments.length !== assessments.length;
  const currentTotalWeight = isUsingVisibleTotal ? visibleWeight : totalWeight;
  const isWeightValid = currentTotalWeight === 100;
  
  const isLocked = currentViewTerm?.closed || activeYear?.closed || (activeTerm && viewTermId !== activeTerm.id);

  const filteredLearners = useMemo(() => {
    return classInfo.learners.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classInfo.learners, searchQuery]);

  // Helper to get raw mark value (checks edited first, then DB)
  const getRawMark = useCallback((assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) {
         return editedMarks[key] === "" ? null : parseFloat(editedMarks[key]);
     }
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.score ?? null;
  }, [editedMarks, marks]);

  // --- Rankings & Totals Logic ---

  const learnerStats = useMemo(() => {
      const stats: Record<string, { total: number; rank: number }> = {};
      const targetAssessments = isUsingVisibleTotal ? visibleAssessments : assessments;

      // 1. Calculate totals
      const learnerTotals: { id: string; total: number }[] = [];

      classInfo.learners.forEach(l => {
          if (!l.id) return;
          let weightedSum = 0;
          
          targetAssessments.forEach(ass => {
              const rawScore = getRawMark(ass.id, l.id!);
              if (rawScore !== null) {
                  const weighted = (rawScore / ass.max_mark) * ass.weight;
                  weightedSum += weighted;
              }
          });
          
          const total = parseFloat(weightedSum.toFixed(1));
          learnerTotals.push({ id: l.id, total });
          stats[l.id] = { total, rank: 0 };
      });

      // 2. Sort and Assign Ranks
      learnerTotals.sort((a, b) => b.total - a.total);

      let currentRank = 1;
      for (let i = 0; i < learnerTotals.length; i++) {
          if (i > 0 && learnerTotals[i].total < learnerTotals[i-1].total) {
              currentRank = i + 1;
          }
          stats[learnerTotals[i].id].rank = currentRank;
      }

      return stats;
  }, [classInfo.learners, isUsingVisibleTotal, visibleAssessments, assessments, getRawMark]);

  // --- Actions ---

  const getMarkValue = (assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) return editedMarks[key];
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.score?.toString() || "";
  };

  const getMarkComment = (assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedComments) return editedComments[key];
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.comment || "";
  };

  const handleMarkChange = (assessmentId: string, learnerId: string, value: string) => {
     if (isLocked) return;
     setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  };

  const handleCommentChange = (assessmentId: string, learnerId: string, value: string) => {
     if (isLocked) return;
     setEditedComments(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  };

  const handleBulkColumnUpdate = (assessmentId: string, value: string) => {
      if (isLocked) return;
      const updates = { ...editedMarks };
      
      classInfo.learners.forEach(l => {
          if (l.id) {
              updates[`${assessmentId}-${l.id}`] = value;
          }
      });
      
      setEditedMarks(updates);
      showSuccess(`Updated column with "${value || 'Cleared'}"`);
  };

  const handleSaveMarks = async () => {
      // Consolidate edits from both marks and comments
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

  const handleBulkImport = async (assessmentId: string, importedMarks: { learnerId: string; score: number }[]) => {
      const updates = importedMarks.map(m => ({
          assessment_id: assessmentId,
          learner_id: m.learnerId,
          score: m.score
      }));
      await updateMarks(updates);
      if (viewTermId) refreshAssessments(classInfo.id, viewTermId);
  };

  const handleAddAssessment = async () => {
     if (!viewTermId) return;
     await createAssessment({
         class_id: classInfo.id,
         term_id: viewTermId,
         title: newAss.title,
         type: newAss.type,
         max_mark: Number(newAss.max),
         weight: Number(newAss.weight),
         date: newAss.date || new Date().toISOString()
     });
     setIsAddOpen(false);
     setNewAss({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  };

  const getLearnerTotal = (learnerId: string) => {
      return learnerStats[learnerId]?.total.toFixed(1) || "0.0";
  };

  const getLearnerRank = (learnerId: string) => {
      const rank = learnerStats[learnerId]?.rank;
      if (!rank) return "-";
      
      const suffix = (n: number) => {
          const v = n % 100;
          return (v >= 11 && v <= 13) ? 'th' : ['th', 'st', 'nd', 'rd', 'th'][v % 10] || 'th';
      };
      return `${rank}${suffix(rank)}`;
  };

  const getAssessmentStats = (assessmentId: string) => {
      const values = classInfo.learners.map(l => {
          if (!l.id) return null;
          const val = getMarkValue(assessmentId, l.id);
          return val !== "" ? parseFloat(val) : null;
      }).filter(v => v !== null) as number[];

      if (values.length === 0) return { avg: '-', max: '-', min: '-' };

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = (sum / values.length).toFixed(1);
      const max = Math.max(...values);
      const min = Math.min(...values);

      return { avg, max, min };
  };

  const openAnalytics = (ass: Assessment) => {
      setSelectedAssessment(ass);
      setAnalyticsOpen(true);
  };

  const handleExportSheet = () => {
    if (!classInfo.learners.length) {
        showError("No learners to export.");
        return;
    }

    try {
        const exportAssessments = isUsingVisibleTotal ? visibleAssessments : assessments;
        const assessmentHeaders = exportAssessments.map(a => `"${a.title} (${a.max_mark})"`);
        const header = ["Learner Name", ...assessmentHeaders, `Total (${currentTotalWeight}%)`, "Position"].join(",");

        const rows = classInfo.learners.map(l => {
            if (!l.id) return "";
            const marksData = exportAssessments.map(a => {
                const m = getMarkValue(a.id, l.id!);
                return m || "";
            });
            const total = getLearnerTotal(l.id);
            const rank = getLearnerRank(l.id);
            return [`"${l.name}"`, ...marksData, total, rank].join(",");
        });

        const csvContent = [header, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `${classInfo.className}_${currentViewTerm?.name}_Marks.csv`.replace(/\s+/g, '_');
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess("Mark sheet exported to CSV.");
    } catch (e) {
        console.error(e);
        showError("Failed to export mark sheet.");
    }
  };

  const toggleAssessmentVisibility = (id: string) => {
    setVisibleAssessmentIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  };

  return {
    state: {
      viewTermId,
      isAddOpen,
      isImportOpen,
      isCopyOpen,
      analyticsOpen,
      newAss,
      editedMarks,
      editedComments,
      searchQuery,
      selectedAssessment,
      visibleAssessmentIds,
      recalculateTotal,
      currentViewTerm,
      visibleAssessments,
      currentTotalWeight,
      isWeightValid,
      isLocked,
      filteredLearners,
      isUsingVisibleTotal,
      assessments,
      marks,
      terms,
      activeTerm,
      activeYear,
      atRiskThreshold
    },
    actions: {
      setViewTermId,
      setIsAddOpen,
      setIsImportOpen,
      setIsCopyOpen,
      setAnalyticsOpen,
      setNewAss,
      setSearchQuery,
      setSelectedAssessment,
      setRecalculateTotal,
      getMarkValue,
      getMarkComment,
      handleMarkChange,
      handleCommentChange,
      handleBulkColumnUpdate,
      handleSaveMarks,
      handleBulkImport,
      handleAddAssessment,
      getLearnerTotal,
      getLearnerRank,
      getAssessmentStats,
      openAnalytics,
      handleExportSheet,
      toggleAssessmentVisibility,
      deleteAssessment,
      refreshAssessments
    }
  };
};