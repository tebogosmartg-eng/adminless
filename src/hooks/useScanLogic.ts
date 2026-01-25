import { useState } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

export interface ScannedLearner {
  name: string;
  mark: string;
}

export interface ScannedDetails {
  subject: string;
  testNumber: string;
  grade: string;
  date: string;
}

export const useScanLogic = () => {
  const { classes, updateLearners, addClass } = useClasses();
  const navigate = useNavigate();
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  
  // State for "Update Existing"
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  
  // State for "Create New"
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

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
      
      setScannedDetails(result.details);
      setScannedLearners(result.learners);
      
      // Auto-populate new class name if detected
      if (result.details) {
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
        subject: "Physical Sciences",
        grade: "Grade 11",
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
      setNewClassName(`${mockDetails.grade} - ${mockDetails.testNumber}`);
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

    let matchedCount = 0;
    const updatedLearners = targetClass.learners.map(learner => {
      const scannedMatch = scannedLearners.find(sl => {
        const slName = sl.name.toLowerCase();
        const lName = learner.name.toLowerCase();
        return slName.includes(lName) || lName.includes(slName);
      });

      if (scannedMatch) {
        try {
          let percentage = "";
          const markStr = scannedMatch.mark.trim();

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

          if (percentage) {
            matchedCount++;
            return { ...learner, mark: percentage };
          }
          
          return learner;
        } catch (e) {
          console.error(`Could not parse mark "${scannedMatch.mark}" for ${learner.name}.`, e);
          return learner; 
        }
      }
      return learner;
    });

    updateLearners(selectedClassId, updatedLearners);
    showSuccess(`Marks saved to ${targetClass.className}. ${matchedCount} learner(s) updated.`);
    
    // Cleanup & Navigate
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
    
    // Cleanup & Navigate
    resetState();
    navigate(`/classes/${newClass.id}`); 
  };

  const resetState = () => {
    setImagePreviews([]);
    setScannedLearners([]);
    setScannedDetails(null);
    setNewClassName("");
    setSelectedClassId(undefined);
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