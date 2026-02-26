import { useState } from 'react';
import { db, ScanJob } from '@/db';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useScanPersistence = () => {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const saveScanJob = async (
    userId: string, 
    classId: string | null, 
    assessmentId: string | null, 
    data: { details: any, learners: any }
  ) => {
    const jobId = crypto.randomUUID();
    const job: ScanJob = {
      id: jobId,
      user_id: userId,
      class_id: classId,
      assessment_id: assessmentId,
      file_path: null,
      status: 'completed',
      raw_extraction_json: data,
      edited_extraction_json: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.scan_jobs.add(job);
    await queueAction('scan_jobs', 'create', job);
    setCurrentJobId(jobId);
    return jobId;
  };

  const handleSaveDraft = async (data: { details: any, learners: any }) => {
    if (!currentJobId) return;
    setIsSavingDraft(true);
    try {
      const updates = {
        edited_extraction_json: data,
        updated_at: new Date().toISOString()
      };
      await db.scan_jobs.update(currentJobId, updates);
      await queueAction('scan_jobs', 'update', { id: currentJobId, ...updates });
      showSuccess("Draft changes saved.");
    } catch (e) {
      showError("Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const archiveScanJob = async (jobId: string | null) => {
    if (!jobId) return;
    const updates = { status: 'archived', updated_at: new Date().toISOString() };
    await db.scan_jobs.update(jobId, updates);
    await queueAction('scan_jobs', 'update', { id: jobId, ...updates });
  };

  return {
    currentJobId, setCurrentJobId,
    isSavingDraft,
    saveScanJob,
    handleSaveDraft,
    archiveScanJob
  };
};