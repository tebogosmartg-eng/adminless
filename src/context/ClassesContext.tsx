import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ClassInfo, Learner } from '../components/CreateClassDialog';
import { useActivity } from './ActivityContext';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface ClassesContextType {
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
  updateLearners: (classId: string, updatedLearners: Learner[]) => void;
  updateClassDetails: (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => void;
  deleteClass: (classId: string) => void;
  updateClassLearners: (classId: string, newLearners: Learner[]) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  // Fetch classes and learners on mount
  useEffect(() => {
    if (!session?.user.id) return;

    const fetchData = async () => {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          learners (*)
        `)
        .eq('user_id', session.user.id);

      if (classesError) {
        console.error('Error fetching classes:', classesError);
        return;
      }

      const formattedClasses: ClassInfo[] = classesData.map((c: any) => ({
        id: c.id,
        grade: c.grade,
        subject: c.subject,
        className: c.class_name,
        learners: c.learners.map((l: any) => ({
          // We attach the ID here to track edits, but the interface Learner might not have it strictly defined yet.
          // For now we map it to match the existing Learner interface, but we might need to rely on names or strict order if not careful.
          // Ideally, Learner interface should have an optional ID.
          name: l.name,
          mark: l.mark,
          comment: l.comment,
          id: l.id 
        }))
      }));

      setClasses(formattedClasses);
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
        class_name: newClass.className
      }])
      .select()
      .single();

    if (classError || !classData) {
      console.error('Error creating class:', classError);
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
      }
      
      // Update local state with real IDs
      const createdClass: ClassInfo = {
        id: classData.id,
        grade: classData.grade,
        subject: classData.subject,
        className: classData.class_name,
        learners: learnersData ? learnersData.map((l: any) => ({
            name: l.name,
            mark: l.mark,
            comment: l.comment,
            id: l.id
        })) : []
      };
      
      setClasses((prev) => [...prev, createdClass]);
    } else {
        const createdClass: ClassInfo = {
            id: classData.id,
            grade: classData.grade,
            subject: classData.subject,
            className: classData.class_name,
            learners: []
        };
        setClasses((prev) => [...prev, createdClass]);
    }

    logActivity(`Created class: "${newClass.subject} - ${newClass.className}"`);
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    // This function assumes we are updating marks/comments for existing learners.
    // However, the input `updatedLearners` might contain new learners if the UI adds them purely client-side before save.
    // Since the app seems to treat 'learners' array as the source of truth, we should reconcile.
    // For simplicity given the "Save" button model:
    // We can upsert if we have IDs, or delete all and re-insert (easiest but changes IDs), or reconcile carefully.
    // Let's iterate and update.

    const classInfo = classes.find(c => c.id === classId);
    if (!classInfo) return;

    // We'll update state optimistically first
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, learners: updatedLearners } : c
      )
    );

    // Now persist to Supabase
    // Strategy: 
    // 1. Get current learners in DB for this class.
    // 2. Identify deletes (in DB but not in updatedLearners).
    // 3. Identify updates (in DB and in updatedLearners).
    // 4. Identify inserts (not in DB but in updatedLearners).
    // Note: The `Learner` interface in `CreateClassDialog` doesn't strictly have ID, but we mapped it in fetch.
    // If `learner` has an `id` property (from our fetch), it's existing. If not, it's new.

    const learnersWithId = updatedLearners.filter((l: any) => l.id);
    const learnersWithoutId = updatedLearners.filter((l: any) => !l.id);

    // 1. Updates
    for (const l of learnersWithId) {
       await supabase.from('learners').update({
           name: l.name,
           mark: l.mark,
           comment: l.comment
       }).eq('id', (l as any).id);
    }

    // 2. Inserts
    if (learnersWithoutId.length > 0) {
        const toInsert = learnersWithoutId.map(l => ({
            class_id: classId,
            name: l.name,
            mark: l.mark || '',
            comment: l.comment || ''
        }));
        const { data: newLearnersData } = await supabase.from('learners').insert(toInsert).select();
        
        // We need to refresh local state with new IDs to prevent future duplicates if saved again immediately
        if (newLearnersData) {
            setClasses(prev => prev.map(c => {
                if (c.id !== classId) return c;
                // Merge new IDs back into the learners array
                // This is tricky without refetching, so let's just refetch the class learners to be safe
                return c; 
            }));
            
             // Refetch learners for this class to get IDs synced
            const { data: refreshedLearners } = await supabase
                .from('learners')
                .select('*')
                .eq('class_id', classId);
                
            if (refreshedLearners) {
                 setClasses(prev => prev.map(c => c.id === classId ? { ...c, learners: refreshedLearners.map((l:any) => ({
                    name: l.name,
                    mark: l.mark,
                    comment: l.comment,
                    id: l.id
                 })) } : c));
            }
        }
    }

    // 3. Deletes
    // Any ID in `classInfo.learners` (old state) that is NOT in `learnersWithId` (new state) should be deleted.
    const currentIds = learnersWithId.map((l:any) => l.id);
    const idsToDelete = classInfo.learners
        .map((l:any) => l.id)
        .filter(id => id && !currentIds.includes(id));

    if (idsToDelete.length > 0) {
        await supabase.from('learners').delete().in('id', idsToDelete);
    }

    logActivity(`Updated class: "${classInfo.subject} - ${classInfo.className}"`);
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    // Optimistic update
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, ...details } : c
      )
    );

    const dbUpdates: any = {};
    if (details.grade) dbUpdates.grade = details.grade;
    if (details.subject) dbUpdates.subject = details.subject;
    if (details.className) dbUpdates.class_name = details.className;

    const { error } = await supabase
      .from('classes')
      .update(dbUpdates)
      .eq('id', classId);

    if (error) {
        console.error("Failed to update class details", error);
        // revert?
    }

    const classInfo = classes.find(c => c.id === classId);
    if (classInfo) {
      logActivity(`Edited details for class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  const deleteClass = async (classId: string) => {
    const classInfo = classes.find(c => c.id === classId);
    
    // Optimistic delete
    setClasses((prevClasses) => prevClasses.filter((c) => c.id !== classId));

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
      
    if (error) {
        console.error("Failed to delete class", error);
    }

    if (classInfo) {
      logActivity(`Deleted class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  // This function is essentially the same as updateLearners in my implementation, 
  // but in the original context it might have been used differently. 
  // I'll alias it to ensure compatibility.
  const updateClassLearners = (classId: string, newLearners: Learner[]) => {
      updateLearners(classId, newLearners);
  };

  return (
    <ClassesContext.Provider value={{ classes, addClass, updateLearners, updateClassDetails, deleteClass, updateClassLearners }}>
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