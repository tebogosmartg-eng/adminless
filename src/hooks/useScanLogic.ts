import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment, ScanType, Learner, AttendanceRecord } from '@/lib/types';
import { db } from '@/db';
import { compressImage } from '@/utils/image';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';

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
  const { classes, addClass, updateLearners } = useClasses();
  const { activeYear, activeTerm, createAssessment, updateMarks } = useAcademic();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [scanType, setScanType] = useState<ScanType>('class_marksheet');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  const [learnerMappings, setLearnerMappings] = useState<Record<number, string>>({});
  
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("new");
  
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const performAutoMatching = useCallback((scanned: ScannedLearner[], existing: Learner[]) => {
    const newMappings: Record<number, string> = {};
    const usedIds = new Set<string>();

    scanned.forEach((sl, idx) => {
        const sName = sl.name.toLowerCase().trim();
        let bestMatch = { id: "", score: 0 };

        existing.forEach(el => {
            if (!el.id || usedIds.has(el.id)) return;
            const eName = el.name.toLowerCase().trim();
            
            if (eName === sName) {
                bestMatch = { id: el.id, score: 1.0 };
                return;
            }
            if (eName.includes(sName) || sName.includes(eName)) {
                bestMatch = { id: el.id, score: 0.9 };
            }
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
            if (location.state.initialClassName) setNewClassName(location.state.initialClassName);
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
        showSuccess(`Loaded ${files.length} images for scanning.`);
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
      showError("Offline: AI scanning requires a connection.");
      return;
    }
    
    setIsProcessing(true);
    try {
      // Use ScanType as the mode
      const result = await processImagesWithGemini(imagePreviews, scanType as any);
      setScannedDetails(result.details || null);
      setScannedLearners(result.learners || []);
      if (result.details?.testNumber) setNewClassName(result.details.testNumber);
      showSuccess("AI extraction complete.");
    } catch (error: any) {
      showError(error.message || "AI Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let mockDetails: ScannedDetails = {
        subject: "Mathematics", grade: "Grade 11", testNumber: "Algebra FAT 1",
        date: new Date().toISOString().split('T')[0]
      };
      let mockLearners: ScannedLearner[] = [
        { name: "Thabo Mbeki", mark: "45", attendanceStatus: 'present' },
        { name: "Sarah Jenkins", mark: "38", attendanceStatus: 'absent' }
      ];
      
      setScannedDetails(mockDetails);
      setScannedLearners(mockLearners);
      setNewClassName(mockDetails.testNumber);
      setIsProcessing(false);
      showSuccess("Simulated context-aware scan complete!");
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
    if (!activeTerm || !activeYear || !selectedClassId || !targetClass) {
        showError("Blocked: Full academic context required.");
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (scanType === 'class_marksheet' || scanType === 'individual_script') {
            let targetAssessmentId = selectedAssessmentId;
            if (selectedAssessmentId === 'new') {
                targetAssessmentId = await createAssessment({
                    class_id: selectedClassId,
                    term_id: activeTerm.id,
                    title: scannedDetails?.testNumber || "Scanned Assessment",
                    type: 'Test', max_mark: 100, weight: 10, date: new Date().toISOString()
                });
            }
            const markUpdates = scannedLearners
                .filter((_, idx) => learnerMappings[idx])
                .map((sl, idx) => ({
                    assessment_id: targetAssessmentId!,
                    learner_id: learnerMappings[idx],
                    score: parseFloat(sl.mark)
                }));
            if (markUpdates.length > 0) await updateMarks(markUpdates);
        }

        if (scanType === 'attendance_register') {
            const dateStr = scannedDetails?.date || new Date().toISOString().split('T')[0];
            const attRecords: AttendanceRecord[] = scannedLearners
                .filter((_, idx) => learnerMappings[idx])
                .map((sl, idx) => ({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    class_id: selectedClassId,
                    term_id: activeTerm.id,
                    learner_id: learnerMappings[idx],
                    status: sl.attendanceStatus || 'present',
                    date: dateStr
                }));
            if (attRecords.length > 0) {
                await db.attendance.bulkPut(attRecords);
                await queueAction('attendance', 'upsert', attRecords);
            }
        }

        if (scanType === 'learner_roster') {
            const existingLearners = targetClass.learners;
            const newNames = scannedLearners.map(sl => ({ name: sl.name, mark: "" }));
            await updateLearners(selectedClassId, [...existingLearners, ...newNames]);
        }

        showSuccess(`Saved data for ${scannedLearners.length} learners.`);
        navigate(`/classes/${selectedClassId}`);

    } catch (e: any) {
        showError("Save failed: " + e.message);
    }
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !activeTerm || !activeYear) return;
    addClass({
      id: crypto.randomUUID(),
      year_id: activeYear.id,
      term_id: activeTerm.id,
      grade: scannedDetails.grade || "Grade Unknown",
      subject: scannedDetails.subject || "Subject Unknown",
      className: newClassName || "New Class",
      learners: scannedLearners.map(sl => ({ name: sl.name, mark: sl.mark })),
      archived: false
    });
    navigate('/classes');
  };

  return {
    scanType, setScanType,
    imagePreviews, isProcessing, scannedDetails, scannedLearners,
    learnerMappings, updateLearnerMapping,
    selectedClassId, setSelectedClassId, newClassName, setNewClassName,
    activeTab, setActiveTab, handleFileChange, handleProcessImage, handleSimulateScan,
    updateScannedDetail, updateScannedLearner, handleSaveToExisting, handleCreateNewClass,
    classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId
  };
};