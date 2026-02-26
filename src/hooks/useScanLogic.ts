import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { ScanType, AttendanceRecord, AssessmentMark, ScanHistory, AssessmentQuestion } from '@/lib/types';
import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile } from '@/services/storage';

// Composed Hooks
import { useScanDataState } from './scan/useScanDataState';
import { useScanFileHandling } from './scan/useScanFileHandling';
import { useScanPersistence } from './scan/useScanPersistence';

export const useScanLogic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes, addClass, updateLearners } = useClasses();
  const { activeYear, activeTerm, createAssessment, updateMarks } = useAcademic();
  const { isOnline } = useSync();

  // Basic Selection State
  const [scanType, setScanType] = useState<ScanType>('class_marksheet');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [existingMarks, setExistingMarks] = useState<AssessmentMark[]>([]);

  // Orchestrated Modules
  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const targetAssessment = useMemo(() => availableAssessments.find(a => a.id === selectedAssessmentId), [availableAssessments, selectedAssessmentId]);

  const {
    scannedDetails, setScannedDetails,
    scannedLearners, setScannedLearners,
    learnerMappings, 
    updateScannedDetail,
    updateScannedLearner,
    updateLearnerMapping
  } = useScanDataState(targetClass?.learners || []);

  const {
    imagePreviews,
    originalFile,
    handleFileChange,
  } = useScanFileHandling();

  const {
    currentJobId, setCurrentJobId,
    isSavingDraft,
    saveScanJob,
    handleSaveDraft: persistDraft,
    archiveScanJob
  } = useScanPersistence();

  // Initial Context Resolution
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

  useEffect(() => {
    const loadLastJob = async () => {
      if (!selectedClassId) return;
      const lastJob = await db.scan_jobs
        .where('class_id')
        .equals(selectedClassId)
        .reverse()
        .sortBy('created_at');
      
      if (lastJob && lastJob.length > 0) {
        const job = lastJob[0];
        if (job.status === 'completed') {
          const data = job.edited_extraction_json || job.raw_extraction_json;
          if (data) {
            setScannedDetails(data.details);
            setScannedLearners(data.learners);
            setCurrentJobId(job.id);
          }
        }
      }
    };
    loadLastJob();
  }, [selectedClassId, setScannedDetails, setScannedLearners, setCurrentJobId]);

  const isExtractionReady = useMemo(() => {
    if (!activeYear || !activeTerm) return false;
    if (!selectedClassId) return false;
    if (['class_marksheet', 'individual_script'].includes(scanType)) {
        return !!selectedAssessmentId;
    }
    return true;
  }, [activeYear, activeTerm, selectedClassId, selectedAssessmentId, scanType]);

  const handleProcessImage = async () => {
    if (!isExtractionReady || imagePreviews.length === 0 || !isOnline) return;
    
    setIsProcessing(true);
    try {
      const result = await processImagesWithGemini(imagePreviews, scanType as any, targetAssessment?.questions || []);
      
      if (!result?.learners && !result?.details) {
          throw new Error("Extraction returned no fields.");
      }

      setScannedDetails(result.details);
      setScannedLearners(result.learners);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveScanJob(user.id, selectedClassId || null, selectedAssessmentId || null, result);
      }

      showSuccess("AI extraction complete.");
    } catch (error: any) {
      showError(error.message || "AI Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScan = () => {
    if (!isExtractionReady) return;
    setIsProcessing(true);
    setTimeout(() => {
      const mockDetails: any = {
        subject: targetClass?.subject || "Mathematics", 
        grade: targetClass?.grade || "Grade 11", 
        testNumber: targetAssessment?.title || "Test 1",
        date: new Date().toISOString().split('T')[0],
        discoveredQuestions: targetAssessment?.questions ? [] : [
          { num: "Q1", max: "10", skill: "Logic" },
          { num: "Q2", max: "10", skill: "Algebra" }
        ]
      };
      
      const randomLearner = targetClass?.learners[Math.floor(Math.random() * targetClass.learners.length)];
      setScannedDetails(mockDetails);
      setScannedLearners([{ name: randomLearner?.name || "Thabo Mbeki", mark: "15", attendanceStatus: 'present' }]);
      setIsProcessing(false);
      showSuccess("Simulation complete.");
    }, 1000);
  };

  const handleSaveToExisting = async () => {
    if (!activeTerm || !activeYear || !selectedClassId || !targetClass) return;

    if (['class_marksheet', 'individual_script'].includes(scanType) && selectedAssessmentId !== 'new') {
        const marks = await db.assessment_marks.where('assessment_id').equals(selectedAssessmentId).toArray();
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

        const before_snapshot = await db.assessment_marks.where('assessment_id').equals(selectedAssessmentId || "").toArray();
        let targetAssessmentId = selectedAssessmentId;
        
        if (selectedAssessmentId === 'new' && (scanType === 'class_marksheet' || scanType === 'individual_script')) {
            const questions: AssessmentQuestion[] = (scannedDetails?.discoveredQuestions || []).map(dq => ({
                id: crypto.randomUUID(),
                question_number: dq.num,
                skill_description: dq.skill || "Discovered Topic",
                max_mark: parseInt(dq.max) || 10
            }));
            targetAssessmentId = await createAssessment({
                class_id: selectedClassId!,
                term_id: activeTerm!.id,
                title: scannedDetails?.testNumber || "Scanned Assessment",
                type: 'Test', 
                max_mark: questions.length > 0 ? questions.reduce((s, q) => s + q.max_mark, 0) : 100, 
                weight: 10, 
                date: new Date().toISOString(),
                questions
            });
        }

        let markUpdates = overriddenUpdates;
        if (!markUpdates) {
            const currentAss = await db.assessments.get(targetAssessmentId!);
            markUpdates = scannedLearners.filter((_, idx) => learnerMappings[idx]).map((sl, idx) => {
                const lId = learnerMappings[idx];
                const questionMarks = sl.questionMarks?.map(qm => ({
                    question_id: currentAss?.questions?.find(q => q.question_number === qm.num)?.id || qm.num,
                    score: parseFloat(qm.score)
                }));
                return { assessment_id: targetAssessmentId!, learner_id: lId, score: parseFloat(sl.mark), question_marks: questionMarks };
            });
        }

        if (markUpdates && markUpdates.length > 0) await updateMarks(markUpdates);

        if (scanType === 'attendance_register') {
            const dateStr = scannedDetails?.date || new Date().toISOString().split('T')[0];
            const attRecords: AttendanceRecord[] = scannedLearners.filter((_, idx) => learnerMappings[idx]).map((sl, idx) => ({
                id: crypto.randomUUID(), user_id: user.id, class_id: selectedClassId, term_id: activeTerm!.id, learner_id: learnerMappings[idx], status: sl.attendanceStatus || 'present', date: dateStr
            }));
            if (attRecords.length > 0) { await db.attendance.bulkPut(attRecords); await queueAction('attendance', 'upsert', attRecords); }
        }

        if (scanType === 'learner_roster') {
            const newNames = scannedLearners.map(sl => ({ name: sl.name, mark: "" }));
            await updateLearners(selectedClassId!, [...targetClass!.learners, ...newNames]);
        }

        let archivePath = "";
        if (originalFile) {
            const { path } = await uploadEvidenceFile(originalFile, user.id);
            archivePath = path;
        }

        const after_snapshot = await db.assessment_marks.where('assessment_id').equals(targetAssessmentId || "").toArray();

        await queueAction('scan_history', 'create', {
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
            before_snapshot, 
            after_snapshot
        } as ScanHistory);

        await archiveScanJob(currentJobId);
        showSuccess("Saved data and archived audit record.");
        setIsConflictOpen(false);
        navigate(`/classes/${selectedClassId}`);
    } catch (e: any) {
        showError("Save failed: " + e.message);
    }
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !activeTerm || !activeYear) return;
    addClass({
      id: crypto.randomUUID(), year_id: activeYear.id, term_id: activeTerm.id, grade: scannedDetails.grade || "Grade Unknown", subject: scannedDetails.subject || "Subject Unknown", className: newClassName || "New Class", learners: scannedLearners.map(sl => ({ name: sl.name, mark: sl.mark })), archived: false
    });
    navigate('/classes');
  };

  return {
    scanType, setScanType, imagePreviews, isProcessing, scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
    selectedClassId, setSelectedClassId, handleClassChange: (id: string) => id === "new" ? setIsCreateClassOpen(true) : setSelectedClassId(id),
    newClassName, setNewClassName, activeTab, setActiveTab, handleFileChange, handleProcessImage, handleSimulateScan,
    updateScannedDetail, updateScannedLearner, handleSaveToExisting, handleCreateNewClass, classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId,
    isExtractionReady, isConflictOpen, setIsConflictOpen, existingMarks, applyScannedData, targetClass, isCreateClassOpen, setIsCreateClassOpen,
    handleSaveDraft: () => persistDraft({ details: scannedDetails, learners: scannedLearners }),
    isSavingDraft
  };
};