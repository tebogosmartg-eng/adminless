import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment, AssessmentQuestion, ScanMode, Learner } from '@/lib/types';
import { db } from '@/db';
import { compressImage } from '@/utils/image';

// Simple fuzzy match helper (Levenshtein distance based similarity)
const calculateSimilarity = (s1: string, s2: string) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  const editDistance = (a: string, b: string) => {
    const costs = [];
    for (let i = 0; i <= a.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= b.length; j++) {
        if (i === 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (a.charAt(i - 1) !== b.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[b.length] = lastValue;
    }
    return costs[b.length];
  };

  return (longerLength - editDistance(longer, shorter)) / longerLength;
};

export const useScanLogic = () => {
  const { classes, addClass } = useClasses();
  const { activeYear, activeTerm, createAssessment, updateMarks } = useAcademic();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [scanMode, setScanMode] = useState<ScanMode>('bulk');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  
  // State for mapping scanned index to existing learner ID
  const [learnerMappings, setLearnerMappings] = useState<Record<number, string>>({});
  
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("new");
  
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  // Automatic matching logic
  const performAutoMatching = useCallback((scanned: ScannedLearner[], existing: Learner[]) => {
    const newMappings: Record<number, string> = {};
    const usedIds = new Set<string>();

    scanned.forEach((sl, idx) => {
        const sName = sl.name.toLowerCase().trim();
        let bestMatch = { id: "", score: 0 };

        existing.forEach(el => {
            if (!el.id || usedIds.has(el.id)) return;
            
            const eName = el.name.toLowerCase().trim();
            
            // 1. Direct match
            if (eName === sName) {
                bestMatch = { id: el.id, score: 1.0 };
                return;
            }

            // 2. Substring match
            if (eName.includes(sName) || sName.includes(eName)) {
                bestMatch = { id: el.id, score: 0.9 };
            }

            // 3. Fuzzy similarity
            const sim = calculateSimilarity(sName, eName);
            if (sim > 0.75 && sim > bestMatch.score) {
                bestMatch = { id: el.id, score: sim };
            }
        });

        if (bestMatch.id) {
            newMappings[idx] = bestMatch.id;
            usedIds.add(bestMatch.id);
        }
    });

    setLearnerMappings(newMappings);
  }, []);

  useEffect(() => {
    if (scannedLearners.length > 0 && targetClass?.learners) {
        performAutoMatching(scannedLearners, targetClass.learners);
    }
  }, [scannedLearners, targetClass, performAutoMatching]);

  useEffect(() => {
    if (location.state) {
        if (location.state.classId) {
            setSelectedClassId(location.state.classId);
            setActiveTab("update");
        }
        if (location.state.createMode) {
            setActiveTab("create");
            if (location.state.initialClassName) {
                setNewClassName(location.state.initialClassName);
            }
        }
    }
  }, [location.state]);

  useEffect(() => {
    const fetchClassAssessments = async () => {
      if (!selectedClassId || !activeTerm) return;
      const data = await db.assessments
        .where('[class_id+term_id]')
        .equals([selectedClassId, activeTerm.id])
        .toArray();
      setAvailableAssessments(data || []);
    };
    fetchClassAssessments();
  }, [selectedClassId, activeTerm]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        const compressedImages = await Promise.all(
            Array.from(files).map(file => compressImage(file))
        );
        setImagePreviews(compressedImages);
        setScannedLearners([]);
        setScannedDetails(null);
        setLearnerMappings({});
        showSuccess(`Loaded ${files.length} image(s). Mode: ${scanMode}`);
      } catch (e) {
        showError("Failed to load or compress images.");
      }
    }
  };

  const handleProcessImage = async () => {
    if (imagePreviews.length === 0) {
      showError("Please upload one or more images first.");
      return;
    }

    if (!isOnline) {
      showError("You are offline. AI scanning requires an internet connection.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await processImagesWithGemini(imagePreviews, scanMode);
      setScannedDetails(result.details || null);
      setScannedLearners(result.learners || []);
      if (result.details?.testNumber) setNewClassName(result.details.testNumber);
      showSuccess(`AI analysis complete. Found ${result.learners.length} results.`);
    } catch (error: any) {
      showError(error.message || "Failed to process images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockDetails: ScannedDetails = {
        subject: "Life Sciences",
        grade: "Grade 10",
        testNumber: "Practical Test 2",
        date: new Date().toISOString().split('T')[0]
      };
      const mockLearners: ScannedLearner[] = [
        { name: "Thabo Mbeki", mark: "45", questionMarks: [{ num: "1", score: "20" }, { num: "2", score: "25" }] },
        { name: "Sarah Jenkins", mark: "38", questionMarks: [{ num: "1", score: "15" }, { num: "2", score: "23" }] }
      ];
      setScannedDetails(mockDetails);
      setScannedLearners(mockLearners);
      setNewClassName(mockDetails.testNumber);
      setIsProcessing(false);
      showSuccess("Simulated scan complete!");
    }, 1000);
  };

  const updateScannedDetail = (field: keyof ScannedDetails, value: string) => {
    if (scannedDetails) setScannedDetails({ ...scannedDetails, [field]: value });
  };

  const updateScannedLearner = (index: number, field: keyof ScannedLearner, value: any) => {
    const updated = [...scannedLearners];
    updated[index] = { ...updated[index], [field]: value };
    setScannedLearners(updated);
  };

  const updateLearnerMapping = (scannedIdx: number, learnerId: string) => {
      setLearnerMappings(prev => ({ ...prev, [scannedIdx]: learnerId }));
  };

  const handleSaveToExisting = async () => {
    if (!activeTerm || !selectedClassId) return;
    if (!targetClass) return;

    let targetAssessmentId = selectedAssessmentId;
    let targetQuestions: AssessmentQuestion[] = [];

    if (selectedAssessmentId === 'new') {
        const uniqueQNums = Array.from(new Set(scannedLearners.flatMap(l => (l.questionMarks || []).map(q => q.num)))).sort();
        targetQuestions = uniqueQNums.map(num => ({ id: crypto.randomUUID(), question_number: `Q${num}`, skill_description: "", max_mark: 0 }));
        targetAssessmentId = await createAssessment({
            class_id: selectedClassId,
            term_id: activeTerm.id,
            title: scannedDetails?.testNumber || "Scanned Task",
            type: 'Test',
            max_mark: 100, 
            weight: 10,
            date: new Date().toISOString(),
            questions: targetQuestions
        });
    } else {
        const existing = availableAssessments.find(a => a.id === selectedAssessmentId);
        targetQuestions = existing?.questions || [];
    }

    const markUpdates: any[] = [];

    scannedLearners.forEach((sl, idx) => {
        const mappedId = learnerMappings[idx];
        
        // If not mapped to existing, we can potentially add as a new learner
        // But for consistency, let's only update if a mapping exists (auto or manual)
        if (mappedId) {
            markUpdates.push({
                assessment_id: targetAssessmentId,
                learner_id: mappedId,
                score: parseFloat(sl.mark),
                question_marks: (sl.questionMarks || []).map(sq => {
                    const qDef = targetQuestions.find(tq => tq.question_number.includes(sq.num));
                    return { question_id: qDef?.id || crypto.randomUUID(), score: parseFloat(sq.score) };
                })
            });
        }
    });

    if (markUpdates.length > 0) {
        await updateMarks(markUpdates);
        showSuccess(`Saved ${markUpdates.length} marks.`);
        navigate(`/classes/${selectedClassId}`);
    } else {
        showError("No mapped learners found. Please link scanned results to your class roster.");
    }
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !activeTerm || !activeYear) return;
    addClass({
      id: crypto.randomUUID(),
      year_id: activeYear.id,
      term_id: activeTerm.id,
      grade: scannedDetails.grade,
      subject: scannedDetails.subject,
      className: newClassName,
      learners: scannedLearners.map(sl => ({ name: sl.name, mark: sl.mark })),
      archived: false
    });
    navigate('/classes');
  };

  return {
    scanMode, setScanMode,
    imagePreviews, isProcessing, scannedDetails, scannedLearners,
    learnerMappings, updateLearnerMapping,
    selectedClassId, setSelectedClassId, newClassName, setNewClassName,
    activeTab, setActiveTab, handleFileChange, handleProcessImage, handleSimulateScan,
    updateScannedDetail, updateScannedLearner, handleSaveToExisting, handleCreateNewClass,
    classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId
  };
};