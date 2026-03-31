import { useState } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { Evidence } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/services/storage';
import { showSuccess, showError } from '@/utils/toast';
import { useAcademic } from '@/context/AcademicContext';

export const useEvidence = (filters: { classId?: string; learnerId?: string; termId?: string }) => {
  const { activeYear, activeTerm } = useAcademic();
  const [isUploading, setIsUploading] = useState(false);

  // Scoped Query
  const evidenceList = useLiveQuery(async () => {
    if (!activeTerm) return [];
    
    if (filters.learnerId) {
        return db.evidence.where('learner_id').equals(filters.learnerId).filter(e => e.term_id === activeTerm.id).toArray();
    }
    
    if (filters.classId) {
        return db.evidence.where('class_id').equals(filters.classId).filter(e => e.term_id === activeTerm.id).toArray();
    }

    return db.evidence.where('term_id').equals(activeTerm.id).toArray();
  }, [filters.classId, filters.learnerId, activeTerm?.id]) || [];

  const addEvidence = async (file: File, category: Evidence['category'], notes?: string) => {
    // VALIDATION: Prevent upload without context
    if (!filters.classId || !activeYear || !activeTerm) {
        showError("Evidence upload blocked: Academic context required.");
        return;
    }
    
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      const { path } = await uploadEvidenceFile(file, user.id);

      const newEvidence: Evidence = {
        id: crypto.randomUUID(),
        user_id: user.id,
        class_id: filters.classId,
        year_id: activeYear.id, // Automatic scoping
        term_id: activeTerm.id, // Automatic scoping
        learner_id: filters.learnerId || null,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        category,
        notes: notes || "",
        created_at: new Date().toISOString()
      };

      await db.evidence.add(newEvidence);
      await queueAction('evidence', 'create', newEvidence);
      
      showSuccess("Evidence attached successfully.");
    } catch (e: any) {
      console.error(e);
      showError("Upload failed: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteEvidence = async (item: Evidence) => {
    try {
      await deleteEvidenceFile(item.file_path);
      await db.evidence.delete(item.id);
      await queueAction('evidence', 'delete', { id: item.id });
      showSuccess("Evidence removed.");
    } catch (e) {
      showError("Failed to delete.");
    }
  };

  return { evidenceList, addEvidence, deleteEvidence, isUploading };
};