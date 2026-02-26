import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useSync } from '@/context/SyncContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { ScanType, AssessmentMark, ScanHistory, ScannedLearner } from '@/lib/types';
import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile } from '@/services/storage';

import { useScanDataState } from './scan/useScanDataState';
import { useScanFileHandling } from './scan/useScanFileHandling';
import { useScanPersistence } from './scan/useScanPersistence';

export const useScanLogic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes, addClass } = useClasses();
  const { activeYear, activeTerm, updateMarks } = useAcademic();
  const { isOnline } = useSync();

  const [scanType, setScanType] = useState<ScanType>('class_marksheet');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [existingMarks, setExistingMarks] = useState<AssessmentMark[]>([]);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("roster");

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

  const { imagePreviews, originalFile, handleFileChange } = useScanFileHandling();
  const { currentJobId, isSavingDraft, saveScanJob, handleSaveDraft: persistDraft, archiveScanJob } = useScanPersistence();

  useEffect(() => {
    if (location.state?.classId) setSelectedClassId(location.state.classId);
  }, [location.state]);

  useEffect(() => {
    const fetchAss = async () => {
      if (!selectedClassId || !activeTerm) return;
      const data = await db.assessments.where('[class_id+term_id]').equals([selectedClassId, activeTerm.id]).toArray();
      setAvailableAssessments(data);
    };
    fetchAss();
  }, [selectedClassId, activeTerm]);

  const handleProcessImage = async () => {
    if (!selectedClassId || !targetAssessment || imagePreviews.length === 0 || !isOnline) return;
    
    setIsProcessing(true);
    try {
      const schema = {
        title: targetAssessment.title,
        total_marks: targetAssessment.max_mark,
        questions: (targetAssessment.questions || []).map(q => ({
          id: q.id,
          label: q.question_number,
          max_mark: q.max_mark
        }))
      };

      const result = await processImagesWithGemini(imagePreviews, schema);
      
      const mappedResults = result.results.map((r: any) => ({
        name: `${r.learner.name} ${r.learner.surname || ''}`.trim(),
        mark: r.totals.total_awarded.toString(),
        questionMarks: r.questions.map((q: any) => ({ num: q.label, score: q.awarded?.toString() || "" })),
        warnings: r.warnings
      }));

      setScannedDetails({ subject: targetAssessment.subject, grade: targetAssessment.grade, testNumber: targetAssessment.title, date: new Date().toISOString() });
      setScannedLearners(mappedResults);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await saveScanJob(user.id, selectedClassId!, selectedAssessmentId, { details: result.details, learners: mappedResults });

      showSuccess(`AI analyzed ${mappedResults.length} scripts.`);
    } catch (error: any) {
      showError(error.message);
    } finally { setIsProcessing(false); }
  };

  const handleSimulateScan = () => {
    const demoData: ScannedLearner[] = [
        { name: "John Doe", mark: "15", questionMarks: [{ num: "1", score: "5" }, { num: "2", score: "10" }] },
        { name: "Jane Smith", mark: "18", questionMarks: [{ num: "1", score: "8" }, { num: "2", score: "10" }] }
    ];
    setScannedLearners(demoData);
    showSuccess("Simulation data loaded.");
  };

  const handleSaveToExisting = async () => {
    if (!activeTerm || !activeYear || !selectedClassId || !targetClass || !targetAssessment) return;
    
    const marksToUpdate = scannedLearners.filter((_, idx) => learnerMappings[idx]).map((sl, idx) => {
        const lId = learnerMappings[idx];
        const questionMarks = sl.questionMarks?.map(qm => {
            const q = targetAssessment.questions?.find(q => q.question_number === qm.num);
            return { question_id: q?.id || qm.num, score: qm.score === "" ? null : parseFloat(qm.score) };
        });

        return {
            assessment_id: selectedAssessmentId,
            learner_id: lId,
            score: parseFloat(sl.mark),
            question_marks: questionMarks
        };
    });

    try {
        await updateMarks(marksToUpdate);
        
        let archivePath = "";
        if (originalFile) {
            const { data: { user } } = await supabase.auth.getUser();
            const { path } = await uploadEvidenceFile(originalFile, user!.id);
            archivePath = path;
        }

        await queueAction('scan_history', 'create', {
            id: crypto.randomUUID(), user_id: targetClass.user_id, class_id: selectedClassId, assessment_id: selectedAssessmentId,
            academic_year_id: activeYear.id, term_id: activeTerm.id, scan_type: scanType, replacement_mode: 'question_level',
            timestamp: new Date().toISOString(), status: 'completed', file_path: archivePath, after_snapshot: marksToUpdate
        });

        await archiveScanJob(currentJobId);
        showSuccess("Saved granular marks to record.");
        navigate(`/classes/${selectedClassId}`);
    } catch (e: any) { showError(e.message); }
  };

  const handleCreateNewClass = async () => {
      setIsCreateClassOpen(true);
  };

  return {
    scanType, setScanType, imagePreviews, isProcessing, scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
    selectedClassId, setSelectedClassId, handleClassChange: (id: string) => id === "new" ? setIsCreateClassOpen(true) : setSelectedClassId(id),
    newClassName, setNewClassName, activeTab, setActiveTab,
    handleFileChange, handleProcessImage, handleSimulateScan, handleSaveToExisting, handleCreateNewClass, classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId,
    isExtractionReady: !!(selectedClassId && selectedAssessmentId), isConflictOpen, setIsConflictOpen, existingMarks, applyScannedData: handleSaveToExisting, targetClass, isCreateClassOpen, setIsCreateClassOpen,
    updateScannedDetail, updateScannedLearner,
    handleSaveDraft: () => persistDraft({ details: scannedDetails, learners: scannedLearners }), isSavingDraft
  };
};