import { createContext, useContext, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { ClassInfo, Learner } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess } from '@/utils/toast';
import { useAcademic } from '@/context/AcademicContext';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ClassesContextType {
  classes: ClassInfo[];
  loading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  preloadClasses: () => Promise<void>;
  addClass: (classInfo: ClassInfo) => Promise<void>;
  updateLearners: (classId: string, updatedLearners: Learner[]) => Promise<void>;
  updateClassDetails: (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  updateClassLearners: (classId: string, newLearners: Learner[]) => Promise<void>;
  toggleClassArchive: (classId: string, archived: boolean) => Promise<void>;
  updateClassNotes: (classId: string, notes: string) => Promise<void>;
  renameLearner: (learnerId: string, newName: string) => Promise<void>;
  finalizeClassTerm: (classId: string) => Promise<void>;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  const { activeYear, activeTerm, diagnosticMode } = useAcademic();
  const queryClient = useQueryClient();
  const refreshingRef = useRef(false);
  const preloadRequestIdRef = useRef(0);
  const preloadInFlightRef = useRef<Promise<void> | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const isReady = !!activeYear?.id && !!activeTerm?.id;

  const fetchClasses = useCallback(async () => {
    if (!session?.user.id) return [];
    if (!diagnosticMode && !isReady) return [];

    try {
        const { data: classesData, error: classesError } = await supabase.from('classes').select('*').eq('user_id', session.user.id);
        if (classesError) throw classesError;
        
        if (!classesData || classesData.length === 0) return [];

        const classIds = classesData.map(c => c.id);
        const { data: learnersData, error: learnersError } = await supabase.from('learners').select('*').in('class_id', classIds);
        if (learnersError) throw learnersError;

        let mappedClasses = classesData.map(c => ({
            id: c.id,
            year_id: c.year_id || activeYear?.id,
            term_id: c.term_id || activeTerm?.id,
            grade: c.grade,
            subject: c.subject,
            className: c.class_name || c.className || "Untitled Class",
            archived: !!c.archived,
            notes: c.notes || '',
            is_finalised: !!c.is_finalised,
            learners: (learnersData || []).filter(l => l.class_id === c.id)
        })) as ClassInfo[];

        if (!diagnosticMode && activeYear && activeTerm) {
            mappedClasses = mappedClasses.filter(c => c.year_id === activeYear.id && c.term_id === activeTerm.id);
        }
        return mappedClasses;
    } catch (error) {
        console.error("AdminLess error: Failed to fetch classes", error);
        return [];
    }
  }, [session?.user.id, diagnosticMode, isReady, activeYear, activeTerm]);

  const classesQueryKey = useMemo(
    () => ['classes', session?.user.id, activeYear?.id, activeTerm?.id, diagnosticMode] as const,
    [session?.user.id, activeYear?.id, activeTerm?.id, diagnosticMode]
  );

  const { data: classes = [], isLoading, isFetching, isFetched } = useQuery({
    queryKey: classesQueryKey,
    queryFn: fetchClasses,
    enabled: !!session?.user.id && (diagnosticMode || isReady)
  });

  const preloadClasses = useCallback(async () => {
    if (!session?.user?.id || (!diagnosticMode && !isReady)) return;
    if (refreshingRef.current && preloadInFlightRef.current) {
      await preloadInFlightRef.current;
      return;
    }

    const existing = queryClient.getQueryData(classesQueryKey);
    const silent = !!existing;
    const requestId = preloadRequestIdRef.current + 1;
    preloadRequestIdRef.current = requestId;
    refreshingRef.current = true;
    if (silent) setManualRefreshing(true);

    const run = queryClient.prefetchQuery({ queryKey: classesQueryKey, queryFn: fetchClasses });
    preloadInFlightRef.current = run;
    try {
      await run;
    } finally {
      if (preloadRequestIdRef.current === requestId) {
        refreshingRef.current = false;
        setManualRefreshing(false);
      }
      preloadInFlightRef.current = null;
    }
  }, [session?.user?.id, diagnosticMode, isReady, queryClient, classesQueryKey, fetchClasses]);

  const loading = isLoading && !isFetched;
  const isRefreshing = ((isFetching && isFetched) || manualRefreshing) && !loading;

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id || !activeYear || !activeTerm) {
        showError("Academic context not loaded.");
        return;
    }

    try {
      const classData = {
        id: newClass.id, 
        user_id: session.user.id,
        year_id: newClass.year_id,
        term_id: newClass.term_id,
        grade: newClass.grade,
        subject: newClass.subject,
        class_name: newClass.className, 
        archived: false,
        notes: newClass.notes || ''
      };

      const { error: cErr } = await supabase.from('classes').insert(classData);
      if (cErr) throw cErr;

      if (newClass.learners.length > 0) {
          const learnersWithIds = newClass.learners.map(l => ({
              id: l.id || crypto.randomUUID(),
              class_id: newClass.id,
              name: l.name,
              gender: l.gender || null,
              mark: l.mark || null,
              comment: l.comment || null
          }));
          const { error: lErr } = await supabase.from('learners').insert(learnersWithIds);
          if (lErr) throw lErr;
      }

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      logActivity(`Created class: "${newClass.className}"`);
    } catch (e: any) {
      console.error("AdminLess error:", e);
      showError("Failed to create class: " + e.message);
      throw e;
    }
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    if (!session?.user.id) return;
    try {
        const { data: currentDbLearners, error: fetchErr } = await supabase.from('learners').select('id').eq('class_id', classId);
        if (fetchErr) throw fetchErr;
        
        const currentIds = (currentDbLearners || []).map(l => l.id);
        
        const newIds = new Set();
        const toUpsert = [];

        for (const l of updatedLearners) {
            const id = l.id || crypto.randomUUID();
            newIds.add(id);
            toUpsert.push({
                id,
                class_id: classId,
                name: l.name,
                gender: l.gender || null,
                mark: l.mark === "" ? null : l.mark,
                comment: l.comment || null
            });
        }

        const toDelete = currentIds.filter(id => !newIds.has(id));
        
        if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('learners').delete().in('id', toDelete);
            if (delErr) throw delErr;
        }
        if (toUpsert.length > 0) {
            const { error: upsertErr } = await supabase.from('learners').upsert(toUpsert);
            if (upsertErr) throw upsertErr;
        }

        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Failed to update roster: " + e.message);
        throw e;
    }
  };

  const renameLearner = async (learnerId: string, newName: string) => {
    try {
        const { error } = await supabase.from('learners').update({ name: newName }).eq('id', learnerId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Failed to rename learner: " + e.message);
        throw e;
    }
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    try {
        const updates: any = {};
        if (details.grade) updates.grade = details.grade;
        if (details.subject) updates.subject = details.subject;
        if (details.className) updates.class_name = details.className;

        const { error } = await supabase.from('classes').update(updates).eq('id', classId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Update failed: " + e.message);
        throw e;
    }
  };

  const updateClassNotes = async (classId: string, notes: string) => {
    try {
        const { error } = await supabase.from('classes').update({ notes }).eq('id', classId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Failed to save notes: " + e.message);
        throw e;
    }
  };

  const finalizeClassTerm = async (classId: string) => {
    try {
        const { error } = await supabase.from('classes').update({ is_finalised: true }).eq('id', classId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
        showSuccess("Class finalised successfully.");
        logActivity(`Finalised class term data.`);
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Failed to finalize class: " + e.message);
        throw e;
    }
  };

  const deleteClass = async (classId: string) => {
    try {
        const { error: delLearnErr } = await supabase.from('learners').delete().eq('class_id', classId);
        if (delLearnErr) throw delLearnErr;
        const { error: delClassErr } = await supabase.from('classes').delete().eq('id', classId);
        if (delClassErr) throw delClassErr;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Failed to delete class: " + e.message);
        throw e;
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    try {
        const { error } = await supabase.from('classes').update({ archived }).eq('id', classId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e: any) {
        console.error("AdminLess error:", e);
        showError("Status update failed: " + e.message);
        throw e;
    }
  };

  const updateClassLearners = async (classId: string, newLearners: Learner[]) => {
      await updateLearners(classId, newLearners);
  };

  return (
    <ClassesContext.Provider value={{ 
      classes, 
      loading,
      isRefreshing,
      hasLoadedOnce: isFetched,
      preloadClasses,
      addClass, 
      updateLearners, 
      updateClassDetails, 
      deleteClass, 
      updateClassLearners, 
      toggleClassArchive,
      updateClassNotes,
      renameLearner,
      finalizeClassTerm
    }}>
      {children}
    </ClassesContext.Provider>
  );
};

export const useClasses = () => {
  const context = useContext(ClassesContext);
  if (context === undefined) {
    throw new Error('useClasses must be used within a ClassesProvider');
  }
  return context;
};