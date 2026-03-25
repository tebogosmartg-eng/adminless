import { createContext, useContext, ReactNode } from 'react';
import { ClassInfo, Learner } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess } from '@/utils/toast';
import { useAcademic } from './AcademicContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ClassesContextType {
  classes: ClassInfo[];
  loading: boolean;
  addClass: (classInfo: ClassInfo) => void;
  updateLearners: (classId: string, updatedLearners: Learner[]) => void;
  updateClassDetails: (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => void;
  deleteClass: (classId: string) => void;
  updateClassLearners: (classId: string, newLearners: Learner[]) => void;
  toggleClassArchive: (classId: string, archived: boolean) => void;
  updateClassNotes: (classId: string, notes: string) => void;
  renameLearner: (learnerId: string, newName: string) => Promise<void>;
  finalizeClassTerm: (classId: string) => Promise<void>;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  const { activeYear, activeTerm, diagnosticMode } = useAcademic();
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading: loading } = useQuery({
    queryKey: ['classes', session?.user.id, activeYear?.id, activeTerm?.id, diagnosticMode],
    queryFn: async () => {
      if (!session?.user.id) return [];
      
      if (!diagnosticMode && (!activeYear || !activeTerm)) {
          return []; 
      }

      const { data: classesData, error: classesError } = await supabase.from('classes').select('*').eq('user_id', session.user.id);
      
      if (classesError) {
        console.warn('Failed to fetch classes remotely', classesError);
        return [];
      }
      
      if (!classesData || classesData.length === 0) return [];

      const classIds = classesData.map(c => c.id);
      
      const { data: learnersData, error: learnersError } = await supabase
        .from('learners')
        .select('*')
        .in('class_id', classIds);
        
      if (learnersError) {
        console.warn('Failed to fetch learners remotely', learnersError);
      }

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
    },
    enabled: !!session?.user.id && (diagnosticMode || (!!activeYear && !!activeTerm))
  });

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id || !activeYear || !activeTerm) {
        showError("Academic context not loaded. Please select a Year and Term.");
        return;
    }

    try {
      const classData = {
        id: newClass.id, 
        user_id: session.user.id,
        grade: newClass.grade,
        subject: newClass.subject,
        class_name: newClass.className, 
        archived: false,
        notes: newClass.notes || ''
      };

      const { error: cErr } = await supabase.from('classes').upsert(classData);
      if (cErr) throw cErr;

      if (newClass.learners.length > 0) {
          const learnersWithIds = newClass.learners.map(l => ({
              id: l.id || crypto.randomUUID(),
              class_id: newClass.id,
              name: l.name,
              mark: l.mark,
              comment: l.comment
          }));
          const { error: lErr } = await supabase.from('learners').upsert(learnersWithIds);
          if (lErr) throw lErr;
      }

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      logActivity(`Created class: "${newClass.className}" for ${activeTerm.name}`);
    } catch (e) {
      console.error(e);
      showError("Failed to create class.");
    }
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    if (!session?.user.id) return;
    try {
        const { data: currentDbLearners } = await supabase.from('learners').select('id').eq('class_id', classId);
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
                mark: l.mark,
                comment: l.comment
            });
        }

        const toDelete = currentIds.filter(id => !newIds.has(id));
        
        if (toDelete.length > 0) {
            await supabase.from('learners').delete().in('id', toDelete);
        }
        if (toUpsert.length > 0) {
            await supabase.from('learners').upsert(toUpsert);
        }

        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        console.error(e);
        showError("Failed to update roster.");
    }
  };

  const renameLearner = async (learnerId: string, newName: string) => {
    try {
        await supabase.from('learners').update({ name: newName }).eq('id', learnerId);
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        showError("Failed to rename learner.");
    }
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    try {
        const updates: any = {};
        if (details.grade) updates.grade = details.grade;
        if (details.subject) updates.subject = details.subject;
        if (details.className) updates.class_name = details.className;

        await supabase.from('classes').update(updates).eq('id', classId);
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        showError("Update failed.");
    }
  };

  const updateClassNotes = async (classId: string, notes: string) => {
    try {
        await supabase.from('classes').update({ notes }).eq('id', classId);
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        showError("Failed to save notes.");
    }
  };

  const finalizeClassTerm = async (classId: string) => {
    try {
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
        showSuccess("Class finalised successfully.");
        logActivity(`Finalised class term data.`);
    } catch (e) {
        showError("Failed to finalize class.");
    }
  };

  const deleteClass = async (classId: string) => {
    try {
        await supabase.from('learners').delete().eq('class_id', classId);
        await supabase.from('classes').delete().eq('id', classId);
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        showError("Failed to delete class.");
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    try {
        await supabase.from('classes').update({ archived }).eq('id', classId);
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (e) {
        showError("Status update failed.");
    }
  };

  const updateClassLearners = (classId: string, newLearners: Learner[]) => {
      updateLearners(classId, newLearners);
  };

  return (
    <ClassesContext.Provider value={{ 
      classes, 
      loading,
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