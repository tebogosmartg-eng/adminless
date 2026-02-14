import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScannedDetails, ScannedLearner, Assessment, ScanType, Learner, AttendanceRecord, AssessmentMark, ScanHistory, AssessmentQuestion } from '@/lib/types';
import { db } from '@/db';
import { compressImage } from '@/utils/image';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile } from '@/services/storage';

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
  const [scannedDetails, setScannedDetails] = useState<(ScannedDetails & { discoveredQuestions?: any[] }) | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  const [learnerMappings, setLearnerMappings] = useState<Record<number, string>>({});
  
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // New class creation state
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);

  // Conflict Resolution State
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [existingMarks, setExistingMarks] = useState<AssessmentMark[]>([]);

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const targetAssessment = useMemo(() => availableAssessments.find(a => a.id === selectedAssessmentId), [availableAssessments, selectedAssessmentId]);

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
      if (selectedAssessmentId !== "new" && !data.some(a => a.id === selectedAssessmentId)) {
        setSelectedAssessmentId("");
      }
    };
    fetchClassAssessments();
  }, [selectedClassId, activeTerm]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        setOriginalFile(files[0]);
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

  const isExtractionReady = useMemo(() => {
    if (!activeYear || !activeTerm) return false;
    if (!selectedClassId) return false;
    if (['class_marksheet', 'individual_script'].includes(scanType)) {
        return !!selectedAssessmentId;
    }
    return true;
  }, [activeYear, activeTerm, selectedClassId, selectedAssessmentId, scanType]);

  const handleProcessImage = async () => {
    if (!isExtractionReady) {
      showError("Please select a Class and Assessment Task first.");
      return;
    }
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
      // Pass question structure if available for guided extraction
      const payload = { 
          images: imagePreviews, 
          scanMode: scanType,
          questions: targetAssessment?.questions || []
      };

      const result = await processImagesWithGemini(payload.images, payload.scanMode as any, payload.questions);
      setScannedDetails(result.details || null);
      setScannedLearners(result.learners || []);
      
      const logMsg = `[SCAN] Type: ${scanType} | Assessment: ${selectedAssessmentId || 'N/A'} | Term: ${activeTerm?.name}`;
      await queueAction('activities', 'create', {
        id: crypto.randomUUID(),
        user_id: (await supabase.auth.getUser()).data.user?.id,
        year_id: activeYear?.id,
        term_id: activeTerm?.id,
        message: logMsg,
        timestamp: new Date().toISOString()
      });

      showSuccess("AI extraction complete.");
    } catch (error: any) {
      showError(error.message || "AI Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScan = () => {
    if (!isExtractionReady) {
      showError("Select context before simulating.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      let mockQuestions = [
          { num: "Q1", max: "10", skill: "Trigonometry" },
          { num: "Q2", max: "15", skill: "Algebra" },
          { num: "Q3", max: "5", skill: "Logic" }
      ];

      let mockDetails: any = {
        subject: targetClass?.subject || "Mathematics", 
        grade: targetClass?.grade || "Grade 11", 
        testNumber: targetAssessment?.title || "Test 1",
        date: new Date().toISOString().split('T')[0],
        discoveredQuestions: targetAssessment?.questions ? [] : mockQuestions
      };
      
      const randomLearner = targetClass?.learners[Math.floor(Math.random() * targetClass.learners.length)];
      
      const activeQs = targetAssessment?.questions || mockQuestions;
      let mockLearners: ScannedLearner[] = [
        { 
            name: randomLearner?.name || "Thabo Mbeki", 
            mark: "45", 
            attendanceStatus: 'present',
            questionMarks: activeQs.map(q => ({ 
                num: (q as any).question_number || (q as any).num, 
                score: (Math.random() * parseFloat((q as any).max_mark || (q as any).max)).toFixed(1).replace(/\.0$/, '') 
            })) || []
        }
      ];

      // Sum the total for simulation
      let total = 0;
      mockLearners[0].questionMarks!.forEach(qm => total += parseFloat(qm.score) || 0);
      mockLearners[0].mark = total.toString();
      
      setScannedDetails(mockDetails);
      setScannedLearners(mockLearners);
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

  const handleClassChange = (id: string) => {
    if (id === "new") {
      setIsCreateClassOpen(true);
    } else {
      setSelectedClassId(id);
    }
  };

  const handleSaveToExisting = async () => {
    if (!activeTerm || !activeYear || !selectedClassId || !targetClass) {
        showError("Blocked: Full academic context required.");
        return;
    }

    // 1. Check for existing marks if it's an assessment scan
    if (['class_marksheet', 'individual_script'].includes(scanType) && selectedAssessmentId !== 'new') {
        const marks = await db.assessment_marks
            .where('assessment_id')
            .equals(selectedAssessmentId)
            .toArray();

        if (marks.length > 0) {
            setExistingMarks(marks);
            setIsConflictOpen(true);
            return;
        }
    }

    await applyScannedData();
  };

  const applyScannedData = async (overriddenUpdates?: any[]) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Capture Before Snapshot
        const beforeSnapshot = await db.assessment_marks
            .where('assessment_id')
            .equals(selectedAssessmentId || "")
            .toArray();

        let targetAssessmentId = selectedAssessmentId;
        
        if (selectedAssessmentId === 'new' && (scanType === 'class_marksheet' || scanType === 'individual_script')) {
            // Create questions from discovery if available
            const questions: AssessmentQuestion[] = (scannedDetails?.discoveredQuestions || []).map(dq => ({
                id: crypto.randomUUID(),
                question_number: dq.num,
                skill_description: dq.skill || "Discovered Topic",
                max_mark: parseInt(dq.max) || 10
            }));

            // Total is sum of questions or extracted total
            const totalMax = questions.length > 0 
                ? questions.reduce((s, q) => s + q.max_mark, 0)
                : 100;

            targetAssessmentId = await createAssessment({
                class_id: selectedClassId!,
                term_id: activeTerm!.id,
                title: scannedDetails?.testNumber || "Scanned Assessment",
                type: 'Test', 
                max_mark: totalMax, 
                weight: 10, 
                date: new Date().toISOString(),
                questions
            });
        }

        let markUpdates = overriddenUpdates;
        
        if (!markUpdates) {
            // Refetch assessment if just created to get the IDs
            const currentAss = await db.assessments.get(targetAssessmentId!);

            markUpdates = scannedLearners
                .filter((_, idx) => learnerMappings[idx])
                .map((sl, idx) => {
                    const lId = learnerMappings[idx];
                    
                    // Format question marks using newly created or existing question IDs
                    const questionMarks = sl.questionMarks?.map(qm => {
                        const qObj = currentAss?.questions?.find(q => q.question_number === qm.num);
                        return {
                            question_id: qObj?.id || qm.num,
                            score: parseFloat(qm.score)
                        };
                    });

                    return {
                        assessment_id: targetAssessmentId!,
                        learner_id: lId,
                        score: parseFloat(sl.mark),
                        question_marks: questionMarks
                    };
                });
        }

        if (markUpdates && markUpdates.length > 0) {
            await updateMarks(markUpdates);
        }

        if (scanType === 'attendance_register') {
            const dateStr = scannedDetails?.date || new Date().toISOString().split('T')[0];
            const attRecords: AttendanceRecord[] = scannedLearners
                .filter((_, idx) => learnerMappings[idx])
                .map((sl, idx) => ({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    class_id: selectedClassId,
                    term_id: activeTerm!.id,
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
            const existingLearners = targetClass!.learners;
            const newNames = scannedLearners.map(sl => ({ name: sl.name, mark: "" }));
            await updateLearners(selectedClassId!, [...existingLearners, ...newNames]);
        }

        // --- AUDIT LOGGING ---
        let archivePath = "";
        if (originalFile) {
            const { path } = await uploadEvidenceFile(originalFile, user.id);
            archivePath = path;
        }

        const afterSnapshot = await db.assessment_marks
            .where('assessment_id')
            .equals(targetAssessmentId || "")
            .toArray();

        const history: ScanHistory = {
            id: crypto.randomUUID(),
            user_id: user.id,
            class_id: selectedClassId!,
            assessment_id: targetAssessmentId,
            academic_year_id: activeYear!.id,
            term_id: activeTerm!.id,
            scan_type: scanType,
            replacement_mode: overriddenUpdates ? 'manual' : 'standard',
            timestamp: new Date().toISOString(),
            status: 'completed',
            file_path: archivePath,
            before_snapshot: beforeSnapshot,
            after_snapshot: afterSnapshot
        };

        await db.scan_history.add(history);
        await queueAction('scan_history', 'create', history);

        showSuccess(`Saved data and archived audit record.`);
        setIsConflictOpen(false);
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
    selectedClassId, setSelectedClassId, handleClassChange,
    newClassName, setNewClassName,
    activeTab, setActiveTab, handleFileChange, handleProcessImage, handleSimulateScan,
    updateScannedDetail, updateScannedLearner, handleSaveToExisting, handleCreateNewClass,
    classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId,
    isExtractionReady,
    isConflictOpen, setIsConflictOpen, existingMarks, applyScannedData, targetClass,
    isCreateClassOpen, setIsCreateClassOpen
  };
};