import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ClassInfo, Learner } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { showError } from '@/utils/toast';

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
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch classes and learners on mount
  useEffect(() => {
    if (!session?.user.id) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          learners (*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (classesError) {
        console.error('Error fetching classes:', classesError);
        showError('Failed to load classes.');
        setLoading(false);
        return;
      }

      try {
        const formattedClasses: ClassInfo[] = (classesData || []).map((c: any) => ({
          id: c.id,
          grade: c.grade,
          subject: c.subject,
          className: c.class_name,
          archived: c.archived || false,
          notes: c.notes || '',
          learners: (c.learners || []).map((l: any) => ({
            name: l.name,
            mark: l.mark,
            comment: l.comment,
            id: l.id 
          }))
        }));

        setClasses(formattedClasses);
      } catch (err) {
        console.error('Error formatting classes data:', err);
        showError('Error processing class data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user.id]);

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id) return;

    // 1. Insert Class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert([{
        user_id: session.user.id,
        grade: newClass.grade,
        subject: newClass.subject,
        class_name: newClass.className,
        archived: false,
        notes: newClass.notes || ''
      }])
      .select()
      .single();

    if (classError || !classData) {
      console.error('Error creating class:', classError);
      showError('Failed to create class.');
      return;
    }

    // 2. Insert Learners
    if (newClass.learners.length > 0) {
      const learnersToInsert = newClass.learners.map(l => ({
        class_id: classData.id,
        name: l.name,
        mark: l.mark || '',
        comment: l.comment || ''
      }));

      const { data: learnersData, error: learnersError } = await supabase
        .from('learners')
        .insert(learnersToInsert)
        .select();

      if (learnersError) {
        console.error('Error adding learners:', learnersError);
        showError('Class created, but failed to add learners.');
      }
      
      const createdClass: ClassInfo = {
        id: classData.id,
        grade: classData.grade,
        subject: classData.subject,
        className: classData.class_name,
        archived: false,
        notes: classData.notes || '',
        learners: learnersData ? learnersData.map((l: any) => ({
            name: l.name,
            mark: l.mark,
            comment: l.comment,
            id: l.id
        })) : []
      };
      
      setClasses((prev) => [createdClass, ...prev]);
    } else {
        const createdClass: ClassInfo = {
            id: classData.id,
            grade: classData.grade,
            subject: classData.subject,
            className: classData.class_name,
            archived: false,
            notes: classData.notes || '',
            learners: []
        };
        setClasses((prev) => [createdClass, ...prev]);
    }

    logActivity(`Created class: "${newClass.subject} - ${newClass.className}"`);
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    const classInfo = classes.find(c => c.id === classId);
    if (!classInfo) return;

    // Optimistic UI update
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, learners: updatedLearners } : c
      )
    );

    const learnersWithId = updatedLearners.filter((l: any) => l.id);
    const learnersWithoutId = updatedLearners.filter((l: any) => !l.id);

    // 1. Bulk Update (Upsert) for existing items
    if (learnersWithId.length > 0) {
      const updates = learnersWithId.map(l => ({
        id: l.id,
        class_id: classId,
        name: l.name,
        mark: l.mark,
        comment: l.comment
      }));
      
      const { error } = await supabase
        .from('learners')
        .upsert(updates, { onConflict: 'id' });
        
      if (error) {
          console.error("Error bulk updating learners:", error);
          showError("Failed to save some learner updates.");
      }
    }

    // 2. Bulk Insert for new items
    if (learnersWithoutId.length > 0) {
        const toInsert = learnersWithoutId.map(l => ({
            class_id: classId,
            name: l.name,
            mark: l.mark || '',
            comment: l.comment || ''
        }));
        const { error } = await supabase.from('learners').insert(toInsert);
        if (error) {
            console.error("Error inserting new learners:", error);
            showError("Failed to save new learners.");
        }
    }

    // 3. Deletes
    const currentIds = learnersWithId.map((l:any) => l.id);
    const idsToDelete = classInfo.learners
        .map((l:any) => l.id)
        .filter(id => id && !currentIds.includes(id));

    if (idsToDelete.length > 0) {
        const { error } = await supabase.from('learners').delete().in('id', idsToDelete);
        if (error) console.error("Error deleting learners:", error);
    }

    // 4. Refetch to get IDs for new items and ensure sync
    const { data: refreshedLearners } = await supabase
        .from('learners')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

    if (refreshedLearners) {
        setClasses(prev => prev.map(c => c.id === classId ? { ...c, learners: refreshedLearners.map((l:any) => ({
            name: l.name,
            mark: l.mark,
            comment: l.comment,
            id: l.id
        })) } : c));
    }

    logActivity(`Updated marks for: "${classInfo.subject} - ${classInfo.className}"`);
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, ...details } : c
      )
    );

    const dbUpdates: any = {};
    if (details.grade) dbUpdates.grade = details.grade;
    if (details.subject) dbUpdates.subject = details.subject;
    if (details.className) dbUpdates.class_name = details.className;

    const { error } = await supabase.from('classes').update(dbUpdates).eq('id', classId);
    if (error) showError("Failed to update class details.");

    const classInfo = classes.find(c => c.id === classId);
    if (classInfo) {
      logActivity(`Edited details for class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  const updateClassNotes = async (classId: string, notes: string) => {
    setClasses((prevClasses) =>
        prevClasses.map((c) =>
          c.id === classId ? { ...c, notes } : c
        )
      );
  
    const { error } = await supabase.from('classes').update({ notes }).eq('id', classId);
    if (error) showError("Failed to save notes.");
  };

  const deleteClass = async (classId: string) => {
    const classInfo = classes.find(c => c.id === classId);
    setClasses((prevClasses) => prevClasses.filter((c) => c.id !== classId));

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) {
        showError("Failed to delete class.");
        // Revert state if needed, but for simplicity we rely on refresh or just show error
    }

    if (classInfo) {
      logActivity(`Deleted class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, archived } : c
      )
    );

    const { error } = await supabase.from('classes').update({ archived }).eq('id', classId);
    if (error) showError("Failed to update archive status.");

    const classInfo = classes.find(c => c.id === classId);
    if (classInfo) {
        const action = archived ? "Archived" : "Restored";
        logActivity(`${action} class: "${classInfo.subject} - ${classInfo.className}"`);
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
      updateClassNotes
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