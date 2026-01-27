import { useState, useEffect, useRef } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment } from '@/lib/types';
import { db } from '@/db';

export const useScanLogic = () => {
  const { classes, updateLearners, addClass } = useClasses();
  const { activeTerm, createAssessment, updateMarks } = useAcademic();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  
  // State for "Update Existing"
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("new");
  
  // State for "Create New"
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

  // Initial values
  const initialValuesRef = useRef<{
    grade?: string;
    subject?: string;
    className?: string;
  }>({});

  useEffect(() => {
    if (location.state) {
        if (location.state.classId) {
            setSelectedClassId(location.state.classId);
            setActiveTab("update");
        }
        if (location.state.createMode) {
            setActiveTab("create");
            initialValuesRef.current = {
                grade: location.state.initialGrade,
                subject: location.state.initialSubject,
                className: location.state.initialClassName
            };
            if (location.state.initialClassName) {
                setNewClassName(location.state.initialClassName);
            }
        }
    }
  }, [location.state]);

  // Fetch assessments locally when class is selected
  useEffect(() => {
    const fetchClassAssessments = async () => {
      if (!selectedClassId || !activeTerm) return;
      
      const data = await db.assessments
        .where('[class_id+term_id]')
        .equals([selectedClassId, activeTerm.id])
        .toArray();
      
      setAvailableAssessments(data || []);
      setSelectedAssessmentId("new");
    };

    fetchClassAssessments();
  }, [selectedClassId, activeTerm]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPreviews: Promise<string>[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        newPreviews.push(new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }));
      });
      
      Promise.all(newPreviews).then((previews) => {
        setImagePreviews(previews);
        setScannedLearners([]);
        setScannedDetails(null);
      });
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
    setScannedLearners([]);
    setScannedDetails(null);

    try {
      const result = await processImagesWithGemini(imagePreviews);
      
      const mergedDetails = { ...result.details };
      if (initialValuesRef.current.grade) mergedDetails.grade = initialValuesRef.current.grade;
      if (initialValuesRef.current.subject) mergedDetails.subject = initialValuesRef.current.subject;

      setScannedDetails(mergedDetails as ScannedDetails);
      setScannedLearners(result.learners);
      
      if (initialValuesRef.current.className) {
        setNewClassName(initialValuesRef.current.className);
      } else if (result.details) {
        setNewClassName(`${result.details.grade} - ${result.details.testNumber || 'Test'}`);
      }
      
      showSuccess(`Processed successfully! Found ${result.learners.length} learners.`);
    } catch (error: any) {
      console.error(error);
      showError(error.message || "Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockDetails: ScannedDetails = {
        subject: initialValuesRef.current.subject || "Physical Sciences",
        grade: initialValuesRef.current.grade || "Grade 11",
        testNumber: "Term 3 Control Test",
        date: new Date().toISOString().split('T')[0]
      };

      const mockLearners: ScannedLearner[] = [
        { name: "Thabo Mbeki", mark: "78" },
        { name: "Sarah Connor", mark: "45" },
        { name: "John Wick", mark: "92" },
        { name: "Ellen Ripley", mark: "88" },
        { name: "Marty McFly", mark: "32" }
      ];

      setScannedDetails(mockDetails);
      setScannedLearners(mockLearners);
      
      if (initialValuesRef.current.className) {
        setNewClassName(initialValuesRef.current.className);
      } else {
        setNewClassName(`${mockDetails.grade} - ${mockDetails.testNumber}`);
      }
      
      setIsProcessing(false);
      showSuccess("Simulated scan complete!");
    }, 1500);
  };

  const updateScannedDetail = (field: keyof ScannedDetails, value: string) => {
    if (scannedDetails) {
      setScannedDetails({ ...scannedDetails, [field]: value });
    }
  };

  const updateScannedLearner = (index: number, field: keyof ScannedLearner, value: string) => {
    const updated = [...scannedLearners];
    updated[index] = { ...updated[index], [field]: value };
    setScannedLearners(updated);
  };

  const handleSaveToExisting = async () => {
    if (!selectedClassId) {
      showError("Please select a class.");
      return;
    }
    if (!activeTerm) {
      showError("No active term selected in Academic Settings.");
      return;
    }

    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) {
      showError("Selected class not found.");
      return;
    }

    // 1. Determine Assessment ID
    let targetAssessmentId = selectedAssessmentId;
    
    if (selectedAssessmentId === 'new') {
        const title = scannedDetails?.testNumber || "Scanned Assessment";
        
        // Use Offline-friendly createAssessment
        targetAssessmentId = await createAssessment({
            class_id: selectedClassId,
            term_id: activeTerm.id,
            title: title,
            type: 'Test',
            max_mark: 100, 
            weight: 0,
            date: scannedDetails?.date || new Date().toISOString()
        });
    }

    // 2. Map Learners & Update/Create
    const learnersMap = new Map(targetClass.learners.map(l => [l.name.toLowerCase(), l]));
    const newLearnersToAdd: any[] = [];
    const markUpdates: { assessment_id: string; learner_id: string; score: number }[] = [];

    // Pre-process to identify new learners
    scannedLearners.forEach(sl => {
        const slNameLower = sl.name.toLowerCase();
        
        // Try match
        let matchedKey = Array.from(learnersMap.keys()).find(key => 
            key.includes(slNameLower) || slNameLower.includes(key)
        );

        if (!matchedKey) {
            // Create ID immediately for offline use
            const newId = crypto.randomUUID();
            const newLearner = { id: newId, name: sl.name, mark: "", comment: "" };
            
            newLearnersToAdd.push(newLearner);
            learnersMap.set(slNameLower, newLearner as any);
        }
    });

    // 2a. Save new learners to DB via Context (Offline friendly)
    if (newLearnersToAdd.length > 0) {
        // Construct the full updated list for the context
        const fullRoster = [...targetClass.learners, ...newLearnersToAdd];
        await updateLearners(selectedClassId, fullRoster);
    }

    // 3. Prepare Mark Updates
    let count = 0;
    scannedLearners.forEach(sl => {
        const slNameLower = sl.name.toLowerCase();
        // Re-match to find (including newly added)
        const matchedKey = Array.from(learnersMap.keys()).find(key => 
            key.includes(slNameLower) || slNameLower.includes(key)
        );

        if (matchedKey) {
            const learner = learnersMap.get(matchedKey)!;
            if (sl.mark && sl.mark.trim() !== '') {
                // Parse mark
                let score = parseFloat(sl.mark);
                // Handle "15/20"
                if (sl.mark.includes('/')) {
                    const parts = sl.mark.split('/');
                    if (parts.length === 2) {
                        score = parseFloat(parts[0]);
                    }
                }
                
                if (!isNaN(score) && learner.id) {
                    markUpdates.push({
                        assessment_id: targetAssessmentId,
                        learner_id: learner.id,
                        score: score
                    });
                    count++;
                }
            }
        }
    });

    if (markUpdates.length > 0) {
        await updateMarks(markUpdates);
        showSuccess(`Saved ${count} marks to assessment.`);
        navigate(`/classes/${selectedClassId}`);
    } else {
        showError("No valid marks found to save.");
    }
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !newClassName) {
      showError("Please ensure all class details are filled out.");
      return;
    }

    const newLearners = scannedLearners.map(sl => ({
        name: sl.name,
        mark: sl.mark // Legacy string storage for immediate view
    }));

    addClass({
      id: crypto.randomUUID(),
      grade: scannedDetails.grade,
      subject: scannedDetails.subject,
      className: newClassName,
      learners: newLearners
    });

    showSuccess(`Created new class "${newClassName}".`);
    resetState();
    navigate('/classes');
  };

  const resetState = () => {
    setImagePreviews([]);
    setScannedLearners([]);
    setScannedDetails(null);
    setNewClassName("");
    setSelectedClassId(undefined);
    initialValuesRef.current = {};
  };

  return {
    imagePreviews,
    isProcessing,
    scannedDetails,
    scannedLearners,
    selectedClassId, setSelectedClassId,
    newClassName, setNewClassName,
    activeTab, setActiveTab,
    handleFileChange,
    handleProcessImage,
    handleSimulateScan,
    updateScannedDetail,
    updateScannedLearner,
    handleSaveToExisting,
    handleCreateNewClass,
    classes,
    availableAssessments,
    selectedAssessmentId,
    setSelectedAssessmentId
  };
};