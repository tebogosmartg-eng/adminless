import { useState, useEffect, useRef } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

export const useScanLogic = () => {
  const { classes, updateLearners, addClass } = useClasses();
  const { activeTerm, createAssessment, updateMarks, refreshAssessments } = useAcademic();
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

  // Fetch assessments when class is selected
  useEffect(() => {
    const fetchClassAssessments = async () => {
      if (!selectedClassId || !activeTerm) return;
      
      const { data } = await supabase
        .from('assessments')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('term_id', activeTerm.id);
      
      setAvailableAssessments(data || []);
      // Default to "new" unless we want to auto-select
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
        const { data: newAss, error } = await supabase
            .from('assessments')
            .insert([{
                class_id: selectedClassId,
                term_id: activeTerm.id,
                title: title,
                type: 'Test',
                max_mark: 100, // Default to percentage, user can edit later
                weight: 0,
                date: scannedDetails?.date || new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error || !newAss) {
            showError("Failed to create new assessment.");
            return;
        }
        targetAssessmentId = newAss.id;
    }

    // 2. Map Learners & Update/Create
    const learnersMap = new Map(targetClass.learners.map(l => [l.name.toLowerCase(), l]));
    const newLearnersToAdd: any[] = [];
    const markUpdates: { assessment_id: string; learner_id: string; score: number }[] = [];

    scannedLearners.forEach(sl => {
        const slNameLower = sl.name.toLowerCase();
        let learnerId = '';

        // Try match
        let matchedKey = Array.from(learnersMap.keys()).find(key => 
            key.includes(slNameLower) || slNameLower.includes(key)
        );

        if (matchedKey) {
            learnerId = learnersMap.get(matchedKey)!.id!;
        } else {
            // Will need to create learner first? 
            // For simplicity in this flow, we will create NEW learners immediately in the DB if not found
            // This requires a synchronous approach or batched insert first
            // Let's defer marks for new learners? Or better, handle it properly.
            // Current `updateLearners` logic in ClassesContext handles creation.
            // But we need IDs for the Marks table.
            
            // NOTE: To properly support "Create Learner AND Add Mark" in one go for relational tables,
            // we should ideally update the class roster first.
            newLearnersToAdd.push({ name: sl.name, mark: "", comment: "" });
        }
    });

    // 2a. Add new learners to class first if any
    if (newLearnersToAdd.length > 0) {
        // We use the existing context method which handles IDs
        // But it's async and we need IDs *now*.
        // Workaround: We'll create them directly via Supabase here to get IDs.
        const { data: createdLearners } = await supabase
            .from('learners')
            .insert(newLearnersToAdd.map(l => ({ class_id: selectedClassId, name: l.name })))
            .select();
            
        if (createdLearners) {
            createdLearners.forEach((l: any) => learnersMap.set(l.name.toLowerCase(), l));
            // Update context state
            const updatedRoster = [...targetClass.learners, ...createdLearners.map((l: any) => ({ name: l.name, mark: "", id: l.id }))];
            updateLearners(selectedClassId, updatedRoster);
        }
    }

    // 3. Prepare Mark Updates
    let count = 0;
    scannedLearners.forEach(sl => {
        // Re-match now that new learners are added
        const slNameLower = sl.name.toLowerCase();
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
                        // If user selected "new" assessment (max 100 default), we store %. 
                        // If existing, we should check max_mark but for now let's just store the number found or %
                        // Simple logic: Store raw number if no /, calculate % if / exists?
                        // Let's assume standard input is raw score.
                        score = parseFloat(parts[0]);
                    }
                }
                
                if (!isNaN(score)) {
                    markUpdates.push({
                        assessment_id: targetAssessmentId,
                        learner_id: learner.id!,
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
    // This remains mostly the same, creating a class with legacy marks initially
    // Or we could create a default assessment?
    if (!scannedDetails || !newClassName) {
      showError("Please ensure all class details are filled out.");
      return;
    }

    const newLearners = scannedLearners.map(sl => ({
        name: sl.name,
        mark: sl.mark // Legacy string storage for immediate view
    }));

    addClass({
      id: new Date().toISOString(),
      grade: scannedDetails.grade,
      subject: scannedDetails.subject,
      className: newClassName,
      learners: newLearners
    });

    showSuccess(`Created new class "${newClassName}".`);
    resetState();
    // We redirect to home or classes as we don't have the ID immediately if addClass is async without return
    // But addClass in context generates ID locally. 
    // Let's just go to classes list.
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