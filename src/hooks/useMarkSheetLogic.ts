import { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '@/context/AcademicContext';
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

  const [viewTermId, setViewTermId] = useState<string | null>(null);
  
  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  // Data States
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // View Options State
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);

  // --- Effects ---

  // Set default view to active term on mount
  useEffect(() => {
    if (activeTerm && !viewTermId) {
        setViewTermId(activeTerm.id);
    }
  }, [activeTerm]);

  // Fetch data when viewTermId changes
  useEffect(() => {
    if (viewTermId) {
        refreshAssessments(classInfo.id, viewTermId);
        setEditedMarks({}); 
    }
  }, [viewTermId, classInfo.id]);

  // Initialize visibility when assessments load
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

  // --- Actions ---

  const getMarkValue = (assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) return editedMarks[key];
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.score?.toString() || "";
  };

  const handleMarkChange = (assessmentId: string, learnerId: string, value: string) => {
     if (isLocked) return;
     setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  };

  const handleSaveMarks = async () => {
      const updates = Object.entries(editedMarks).map(([key, value]) => {
          const [assessmentId, learnerId] = key.split('-');
          const score = value === "" ? null : parseFloat(value);
          return { assessment_id: assessmentId, learner_id: learnerId, score };
      });

      if (updates.length > 0) {
          await updateMarks(updates);
          setEditedMarks({});
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

  const calculateLearnerTotal = (learnerId: string) => {
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
        const header = ["Learner Name", ...assessmentHeaders, `Total (${currentTotalWeight}%)`].join(",");

        const rows = classInfo.learners.map(l => {
            if (!l.id) return "";
            const marksData = exportAssessments.map(a => {
                const m = getMarkValue(a.id, l.id!);
                return m || "";
            });
            const total = calculateLearnerTotal(l.id);
            return [`"${l.name}"`, ...marksData, total].join(",");
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
      activeYear
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
      getMarkValue, // Added here
      handleMarkChange,
      handleSaveMarks,
      handleBulkImport,
      handleAddAssessment,
      calculateLearnerTotal,
      getAssessmentStats,
      openAnalytics,
      handleExportSheet,
      toggleAssessmentVisibility,
      deleteAssessment,
      refreshAssessments
    }
  };
};