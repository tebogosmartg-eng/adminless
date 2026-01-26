import { createContext, useContext, ReactNode } from 'react';
import { ClassInfo, Learner } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';

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

  // Read from Local DB
  const classes = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    
    const allClasses = await db.classes
        .where('user_id')
        .equals(session.user.id)
        .reverse()
        .sortBy('created_at'); // Assuming created_at field exists in types and is sortable, if not sort in JS

    const allLearners = await db.learners.toArray();

    // Join manually
    return allClasses.map(c => ({
        id: c.id,
        grade: c.grade,
        subject: c.subject,
        className: c.className,
        archived: !!c.archived,
        notes: c.notes || '',
        learners: allLearners.filter(l => l.class_id === c.id)
    })) as ClassInfo[];
  }, [session?.user.id]) || [];

  const loading = !classes && !!session?.user.id;

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id) return;

    try {
      // 1. Prepare Local Data
      const classData = {
        id: newClass.id, // Ensure ID is generated before calling this
        user_id: session.user.id,
        grade: newClass.grade,
        subject: newClass.subject,
        class_name: newClass.className, // Map front-end prop to DB col
        className: newClass.className, // Dexie stores what we give it, keeping both for compatibility or clean up types later
        archived: false,
        notes: newClass.notes || '',
        created_at: new Date().toISOString()
      };

      // 2. Write to Local DB
      await db.classes.add(classData);
      
      // 3. Queue Sync
      // Supabase column is `class_name`
      const syncData = { ...classData };
      delete (syncData as any).className; 
      delete (syncData as any).learners;
      
      await queueAction('classes', 'insert', syncData);

      // Learners
      if (newClass.learners.length > 0) {
        // Generate IDs for learners if missing
        const learnersWithIds = newClass.learners.map(l => ({
            ...l,
            id: l.id || crypto.randomUUID(),
            class_id: newClass.id
        }));

        await db.learners.bulkAdd(learnersWithIds as any);
        await queueAction('learners', 'insert', learnersWithIds);
      }

      logActivity(`Created class: "${newClass.subject} - ${newClass.className}"`);
    } catch (e) {
      console.error(e);
      showError("Failed to create class locally.");
    }
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    try {
        const classInfo = classes.find(c => c.id === classId);
        if (!classInfo) return;

        // Process learners: identify updates, inserts, deletes
        // For simplicity in offline-first, upserting all provided is easiest,
        // but we need to handle deletes if the list is shorter? 
        // The current app logic passes the FULL list of desired learners.
        
        // 1. Get current DB learners for this class
        const currentDbLearners = await db.learners.where('class_id').equals(classId).toArray();
        const currentIds = new Set(currentDbLearners.map(l => l.id));
        
        const toUpsert = [];
        const newIds = new Set();

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

        // Identify deletions
        const toDelete = currentDbLearners.filter(l => !newIds.has(l.id)).map(l => l.id!);

        // Local DB Execute
        if (toDelete.length > 0) await db.learners.bulkDelete(toDelete);
        await db.learners.bulkPut(toUpsert as any);

        // Queue Actions
        // Ideally we batch these for Supabase efficiency, but simple queueAction works per row or we adapt queueAction to handle arrays (which sync.ts supports if we pass array to insert/upsert)
        
        if (toUpsert.length > 0) {
            await queueAction('learners', 'upsert', toUpsert);
        }
        if (toDelete.length > 0) {
            // Queue deletes individually as our sync implementation is simple eq('id', payload.id)
            for (const id of toDelete) {
                await queueAction('learners', 'delete', { id });
            }
        }

        logActivity(`Updated marks for: "${classInfo.subject} - ${classInfo.className}"`);
    } catch (e) {
        console.error(e);
        showError("Failed to save updates locally.");
    }
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    try {
        // Map details to DB columns
        const updates: any = {};
        if (details.grade) updates.grade = details.grade;
        if (details.subject) updates.subject = details.subject;
        if (details.className) {
            updates.class_name = details.className; // for Supabase/DB
            updates.className = details.className; // for Dexie local usage
        }

        await db.classes.update(classId, updates);
        
        // Queue (clean up local-only props)
        const syncUpdates = { ...updates, id: classId };
        delete syncUpdates.className;
        await queueAction('classes', 'update', syncUpdates);

        logActivity("Class details updated.");
    } catch (e) {
        console.error(e);
        showError("Update failed.");
    }
  };

  const updateClassNotes = async (classId: string, notes: string) => {
    try {
        await db.classes.update(classId, { notes });
        await queueAction('classes', 'update', { id: classId, notes });
    } catch (e) {
        showError("Failed to save notes.");
    }
  };

  const deleteClass = async (classId: string) => {
    try {
        const classInfo = classes.find(c => c.id === classId);
        
        // Local Delete (Cascade learners manually if needed, Dexie doesn't cascade)
        await db.learners.where('class_id').equals(classId).delete();
        await db.classes.delete(classId);

        // Queue
        await queueAction('classes', 'delete', { id: classId });
        
        if (classInfo) {
            logActivity(`Deleted class: "${classInfo.subject} - ${classInfo.className}"`);
        }
    } catch (e) {
        showError("Failed to delete class.");
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    try {
        await db.classes.update(classId, { archived });
        await queueAction('classes', 'update', { id: classId, archived });
        
        const classInfo = classes.find(c => c.id === classId);
        if (classInfo) {
            logActivity(`${archived ? "Archived" : "Restored"} class: "${classInfo.subject} - ${classInfo.className}"`);
        }
    } catch (e) {
        showError("Failed to update status.");
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