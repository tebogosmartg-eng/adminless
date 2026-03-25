import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { processImagesWithGemini } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';
import { ScanType, AssessmentMark, ScannedLearner } from '@/lib/types';
import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile } from '@/services/storage';

import { useScanDataState } from './scan/useScanDataState';
import { useScanFileHandling } from './scan/useScanFileHandling';
import { useScanPersistence } from './scan/useScanPersistence';

export const useScanLogic = (defaultClassId?: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes } = useClasses();
  const { activeYear, activeTerm, updateMarks } = useAcademic();

  const [scanType, setScanType] = useState<ScanType>('class_marksheet');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(defaultClassId);
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
    else if (defaultClassId) setSelectedClassId(defaultClassId);
  }, [location.state, defaultClassId]);

  useEffect(() => {
    const fetchAss = async () => {
      if (!selectedClassId || !activeTerm) return;
      const data = await db.assessments.where('[class_id+term_id]').equals([selectedClassId, activeTerm.id]).toArray();
      setAvailableAssessments(data);
    };
    fetchAss();
  }, [selectedClassId, activeTerm]);

  const handleProcessImage = async () => {
    if (!selectedClassId || !targetAssessment || imagePreviews.length === 0 || !navigator.onLine) return;
    
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
      
      const mappedResults = result.results.map((r: any) => {
        // Enforce strict mapping against the schema so UI arrays are always in order
        const questionMarks = (targetAssessment.questions || []).map(schemaQ => {
            const aiQ = r.questions?.find((q: any) => q.id === schemaQ.id || q.label === schemaQ.question_number);
            return {
                num: schemaQ.question_number,
                score: aiQ?.awarded?.toString() ?? "",
                confidence: aiQ?.confidence ?? 1.0,
                evidenceText: aiQ?.evidence_text ?? ""
            };
        });

        // Compute total from the mapped questions for accuracy
        const total = questionMarks.reduce((sum, qm) => sum + (parseFloat(qm.score) || 0), 0);

        return {
            name: `${r.learner.name} ${r.learner.surname || ''}`.trim(),
            mark: total.toFixed(1).replace(/\.0$/, ''),
            questionMarks,
            warnings: r.warnings || []
        };
      });

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
    // Generate dummy mapped data based on actual assessment schema if available
    const qms1 = targetAssessment?.questions?.map(q => ({ num: q.question_number, score: Math.floor(Math.random() * q.max_mark).toString(), confidence: 0.9, evidenceText: "Clearly written." })) || [];
    const qms2 = targetAssessment?.questions?.map(q => ({ num: q.question_number, score: Math.floor(Math.random() * q.max_mark).toString(), confidence: 0.9, evidenceText: "Clearly written." })) || [];
    
    const demoData: ScannedLearner[] = [
        { name: "John Doe", mark: qms1.reduce((sum, q) => sum + parseFloat(q.score), 0).toString(), questionMarks: qms1 },
        { name: "Jane Smith", mark: qms2.reduce((sum, q) => sum + parseFloat(q.score), 0).toString(), questionMarks: qms2 }
    ];
    setScannedLearners(demoData);
    showSuccess("Simulation data loaded.");
  };

  const prepareMarksForSave = () => {
      return scannedLearners.filter((_, idx) => learnerMappings[idx]).map((sl, idx) => {
          const lId = learnerMappings[idx];
          const questionMarks = sl.questionMarks?.map(qm => {
              const q = targetAssessment?.questions?.find(q => q.question_number === qm.num);
              return { question_id: q?.id || qm.num, score: qm.score === "" ? null : parseFloat(qm.score) };
          });
  
          return {
              assessment_id: selectedAssessmentId,
              learner_id: lId,
              score: parseFloat(sl.mark),
              question_marks: questionMarks
          };
      });
  };

  const commitMarksToDatabase = async (updates: any[]) => {
      if (!activeTerm || !activeYear || !selectedClassId || !targetClass || !targetAssessment) return;
      
      try {
          await updateMarks(updates);
          
          let archivePath = "";
          if (originalFile) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                  const { path } = await uploadEvidenceFile(originalFile, user.id);
                  archivePath = path;
              }
          }
  
          await queueAction('scan_history', 'create', {
              id: crypto.randomUUID(), user_id: targetClass.user_id, class_id: selectedClassId, assessment_id: selectedAssessmentId,
              academic_year_id: activeYear.id, term_id: activeTerm.id, scan_type: scanType, replacement_mode: 'question_level',
              timestamp: new Date().toISOString(), status: 'completed', file_path: archivePath, after_snapshot: updates
          });
  
          await archiveScanJob(currentJobId);
          showSuccess("Saved granular marks to record.");
          
          // Re-route slightly dynamically based on whether we are in a modal or page context
          if (!defaultClassId) navigate(`/classes/${selectedClassId}`);
          
      } catch (e: any) { 
          showError(e.message || "Failed to commit marks."); 
      }
  };

  const handleSaveToExisting = async () => {
    // Check for existing marks to detect conflicts
    const currentMarks = await db.assessment_marks.where('assessment_id').equals(selectedAssessmentId).toArray();
    const hasConflict = scannedLearners.some((_, idx) => {
        const lId = learnerMappings[idx];
        return currentMarks.some(m => m.learner_id === lId && m.score !== null);
    });

    if (hasConflict && !isConflictOpen) {
        setExistingMarks(currentMarks);
        setIsConflictOpen(true);
        return;
    }

    const marksToUpdate = prepareMarksForSave();
    await commitMarksToDatabase(marksToUpdate);
  };

  const applyScannedData = async (updates: any[]) => {
      await commitMarksToDatabase(updates);
      setIsConflictOpen(false);
  };

  const handleCreateNewClass = async () => {
      setIsCreateClassOpen(true);
  };

  return {
    scanType, setScanType, imagePreviews, isProcessing, scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
    selectedClassId, setSelectedClassId, handleClassChange: (id: string) => id === "new" ? setIsCreateClassOpen(true) : setSelectedClassId(id),
    newClassName, setNewClassName, activeTab, setActiveTab,
    handleFileChange, handleProcessImage, handleSimulateScan, handleSaveToExisting, handleCreateNewClass, classes, availableAssessments, selectedAssessmentId, setSelectedAssessmentId,
    isExtractionReady: !!(selectedClassId && selectedAssessmentId), isConflictOpen, setIsConflictOpen, existingMarks, applyScannedData, targetClass, targetAssessment, isCreateClassOpen, setIsCreateClassOpen,
    updateScannedDetail, updateScannedLearner,
    handleSaveDraft: () => persistDraft({ details: scannedDetails, learners: scannedLearners }), isSavingDraft
  };
};