import { useState, useEffect, useRef } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner } from '@/lib/types';

export const useScanLogic = () => {
  const { classes, updateLearners, addClass } = useClasses();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  
  // State for "Update Existing"
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  
  // State for "Create New"
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

  // Initial values from navigation state
  const initialValuesRef = useRef<{
    grade?: string;
    subject?: string;
    className?: string;
  }>({});

  useEffect(() => {
    // If navigating from another page...
    if (location.state) {
        // ...with classId, pre-select it (Update mode)
        if (location.state.classId) {
            setSelectedClassId(location.state.classId);
            setActiveTab("update");
        }
        
        // ...with createMode, setup creation defaults
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
      
      // Merge AI result with initial values if available
      const mergedDetails = { ...result.details };
      if (initialValuesRef.current.grade) mergedDetails.grade = initialValuesRef.current.grade;
      if (initialValuesRef.current.subject) mergedDetails.subject = initialValuesRef.current.subject;

      setScannedDetails(mergedDetails as ScannedDetails);
      setScannedLearners(result.learners);
      
      // Determine new class name logic
      // 1. If user typed one in CreateClassDialog, keep it.
      // 2. Else use AI guess.
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
    
    // Simulate a delay to feel real
    setTimeout(() => {
      const mockDetails: ScannedDetails = {
        subject: initialValuesRef.current.subject || "Physical Sciences",
        grade: initialValuesRef.current.grade || "Grade 11",
        testNumber: "Term 3 Control Test",
        date: new Date().toISOString().split('T')[0]
      };

      const mockLearners: ScannedLearner[] = [
        { name: "Thabo Mbeki", mark: "78%" },
        { name: "Sarah Connor", mark: "45/60" },
        { name: "John Wick", mark: "92" },
        { name: "Ellen Ripley", mark: "88%" },
        { name: "Marty McFly", mark: "32/60" }
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

  const handleSaveToExisting = () => {
    if (!selectedClassId) {
      showError("Please select a class to save the marks.");
      return;
    }
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) {
      showError("Selected class not found.");
      return;
    }

    // Merge strategy:
    // 1. If scan has mark, try to match name and update mark.
    // 2. If scan has NO matching name in class, ADD it as a new learner.
    
    const learnersMap = new Map(targetClass.learners.map(l => [l.name.toLowerCase(), l]));
    const newLearnersToAdd: any[] = [];
    let updatedCount = 0;
    let addedCount = 0;

    scannedLearners.forEach(sl => {
        const slNameLower = sl.name.toLowerCase();
        
        // Try fuzzy match or direct match
        let matchedKey = Array.from(learnersMap.keys()).find(key => 
            key.includes(slNameLower) || slNameLower.includes(key)
        );

        if (matchedKey) {
            // Update existing
            const learner = learnersMap.get(matchedKey)!;
            
            // Parse mark
            let percentage = learner.mark; // Default to existing
            if (sl.mark && sl.mark.trim() !== '') {
                 try {
                    const markStr = sl.mark.trim();
                    if (markStr.includes("/")) {
                        const parts = markStr.split('/');
                        if (parts.length === 2) {
                        const obtained = parseFloat(parts[0]);
                        const total = parseFloat(parts[1]);
                        if (!isNaN(obtained) && !isNaN(total) && total !== 0) {
                            percentage = ((obtained / total) * 100).toFixed(1);
                        }
                        }
                    } else if (markStr.includes("%")) {
                        percentage = markStr.replace("%", "").trim();
                    } else {
                        const num = parseFloat(markStr);
                        if(!isNaN(num)) percentage = num.toString();
                    }
                 } catch(e) { console.error(e); }
            }

            learnersMap.set(matchedKey, { ...learner, mark: percentage });
            updatedCount++;
        } else {
            // Add new learner
            let percentage = "";
            if (sl.mark && sl.mark.trim() !== '') {
                 const markStr = sl.mark.trim();
                 if (markStr.includes("%")) percentage = markStr.replace("%", "");
                 else percentage = markStr;
            }
            
            newLearnersToAdd.push({ name: sl.name, mark: percentage, comment: "" });
            addedCount++;
        }
    });

    const finalLearners = [...Array.from(learnersMap.values()), ...newLearnersToAdd];

    updateLearners(selectedClassId, finalLearners);
    showSuccess(`Saved to ${targetClass.className}. Updated ${updatedCount}, Added ${addedCount} new learners.`);
    
    resetState();
    navigate(`/classes/${selectedClassId}`);
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !newClassName) {
      showError("Please ensure all class details are filled out.");
      return;
    }

    const newLearners = scannedLearners.map(sl => {
      let mark = sl.mark;
      const markStr = sl.mark.trim();
      
      if (markStr.includes("/")) {
        const parts = markStr.split('/');
        if (parts.length === 2) {
          const obtained = parseFloat(parts[0]);
          const total = parseFloat(parts[1]);
          if (!isNaN(obtained) && !isNaN(total) && total !== 0) {
            mark = ((obtained / total) * 100).toFixed(1);
          }
        }
      } else if (markStr.includes("%")) {
        mark = markStr.replace("%", "").trim();
      }

      return {
        name: sl.name,
        mark: mark
      };
    });

    const newClass = {
      id: new Date().toISOString(),
      grade: scannedDetails.grade,
      subject: scannedDetails.subject,
      className: newClassName,
      learners: newLearners
    };

    addClass(newClass);
    showSuccess(`Created new class "${newClassName}" with ${newLearners.length} learners.`);
    
    resetState();
    navigate(`/classes/${newClass.id}`); 
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
    classes
  };
};