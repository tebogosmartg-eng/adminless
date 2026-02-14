import { useState, useEffect, useRef } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment, AssessmentQuestion, ScanMode } from '@/lib/types';
import { db } from '@/db';
import { compressImage } from '@/utils/image';

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
  
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("new");
  
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

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

  const handleSaveToExisting = async () => {
    if (!activeTerm || !selectedClassId) return;
    const targetClass = classes.find(c => c.id === selectedClassId);
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

    const learnersMap = new Map(targetClass.learners.map(l => [l.name.toLowerCase(), l]));
    const markUpdates: any[] = [];

    for (const sl of scannedLearners) {
        const matchedLearner = Array.from(learnersMap.values()).find(l => l.name.toLowerCase().includes(sl.name.toLowerCase()) || sl.name.toLowerCase().includes(l.name.toLowerCase()));
        if (matchedLearner?.id) {
            markUpdates.push({
                assessment_id: targetAssessmentId,
                learner_id: matchedLearner.id,
                score: parseFloat(sl.mark),
                question_marks: (sl.questionMarks || []).map(sq => {
                    const qDef = targetQuestions.find(tq => tq.question_number.includes(sq.num));
                    return { question_id: qDef?.id || crypto.randomUUID(), score: parseFloat(sq.score) };
                })
            });
        }
    }

    if (markUpdates.length > 0) {
        await updateMarks(markUpdates);
        showSuccess(`Saved ${markUpdates.length} marks.`);
        navigate(`/classes/${selectedClassId}`);
    } else {
        showError("No matching learners found to save marks.");
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
    selectedClassId, setSelectedClassId, newClassName, setNewClassName,
    activeTab, setActiveTab, handleFileChange, handleProcessImage, handleSimulateScan,
    updateScannedDetail, updateScannedLearner, handleSaveToExisting, handleCreateNewClass,
    classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId
  };
};