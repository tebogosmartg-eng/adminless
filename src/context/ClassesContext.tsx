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
  renameLearner: (learnerId: string, newName: string) => Promise<void>;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();

  const classes = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    
    const allClassesInDb = await db.classes.toArray();
    const userClasses = allClassesInDb.filter(c => !c.user_id || c.user_id === session.user.id);

    const itemsToUpdate = userClasses.filter(c => !c.user_id);
    if (itemsToUpdate.length > 0) {
        for (const c of itemsToUpdate) {
            await db.classes.update(c.id, { user_id: session.user.id });
            await queueAction('classes', 'update', { id: c.id, user_id: session.user.id });
        }
    }

    const allLearners = await db.learners.toArray();

    return userClasses.map(c => ({
        id: c.id,
        grade: c.grade,
        subject: c.subject,
        className: c.className || (c as any).class_name || "Untitled Class",
        archived: !!c.archived,
        notes: c.notes || '',
        learners: allLearners.filter(l => l.class_id === c.id)
    })) as ClassInfo[];
  }, [session?.user.id]) || [];

  const loading = !classes && !!session?.user.id;

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id) return;

    try {
      const classData = {
        id: newClass.id, 
        user_id: session.user.id,
        grade: newClass.grade,
        subject: newClass.subject,
        className: newClass.className, 
        archived: false,
        notes: newClass.notes || '',
        created_at: new Date().toISOString()
      };

      await db.transaction('rw', [db.classes, db.learners, db.sync_queue], async () => {
        await db.classes.add(classData);
        await queueAction('classes', 'create', classData);

        if (newClass.learners.length > 0) {
          const learnersWithIds = newClass.learners.map(l => ({
              ...l,
              id: l.id || crypto.randomUUID(),
              class_id: newClass.id
          }));

          await db.learners.bulkAdd(learnersWithIds as any);
          await queueAction('learners', 'create', learnersWithIds);
        }
      });

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

        await db.transaction('rw', [db.learners, db.sync_queue], async () => {
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

            const toDelete = currentDbLearners.filter(l => !newIds.has(l.id)).map(l => l.id!);

            if (toDelete.length > 0) await db.learners.bulkDelete(toDelete);
            await db.learners.bulkPut(toUpsert as any);

            if (toUpsert.length > 0) {
                await queueAction('learners', 'upsert', toUpsert);
            }
            if (toDelete.length > 0) {
                for (const id of toDelete) {
                    await queueAction('learners', 'delete', { id });
                }
            }
        });

        logActivity(`Updated learner roster/legacy marks for: "${classInfo.subject} - ${classInfo.className}"`);
    } catch (e) {
        console.error(e);
        showError("Failed to save updates locally.");
    }
  };

  const renameLearner = async (learnerId: string, newName: string) => {
    try {
        await db.transaction('rw', [db.learners, db.sync_queue], async () => {
            await db.learners.update(learnerId, { name: newName });
            await queueAction('learners', 'update', { id: learnerId, name: newName });
        });
        logActivity(`Renamed student to: "${newName}"`);
    } catch (e) {
        console.error(e);
        showError("Failed to rename learner.");
    }
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    try {
        const updates: any = {};
        if (details.grade) updates.grade = details.grade;
        if (details.subject) updates.subject = details.subject;
        if (details.className) updates.className = details.className;

        await db.transaction('rw', [db.classes, db.sync_queue], async () => {
            await db.classes.update(classId, updates);
            await queueAction('classes', 'update', { ...updates, id: classId });
        });

        const cls = classes.find(c => c.id === classId);
        logActivity(`Updated metadata for class: "${cls?.className}"`);
    } catch (e) {
        console.error(e);
        showError("Update failed.");
    }
  };

  const updateClassNotes = async (classId: string, notes: string) => {
    try {
        const cls = classes.find(c => c.id === classId);
        await db.transaction('rw', [db.classes, db.sync_queue], async () => {
            await db.classes.update(classId, { notes });
            await queueAction('classes', 'update', { id: classId, notes });
        });
        logActivity(`Updated teacher reflection notes for: "${cls?.className}"`);
    } catch (e) {
        showError("Failed to save notes.");
    }
  };

  const deleteClass = async (classId: string) => {
    try {
        const classInfo = classes.find(c => c.id === classId);
        
        await db.transaction('rw', [db.classes, db.learners, db.sync_queue], async () => {
            await db.learners.where('class_id').equals(classId).delete();
            await db.classes.delete(classId);
            await queueAction('classes', 'delete', { id: classId });
        });
        
        if (classInfo) {
            logActivity(`Deleted class and all associated data: "${classInfo.subject} - ${classInfo.className}"`);
        }
    } catch (e) {
        showError("Failed to delete class.");
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    try {
        await db.transaction('rw', [db.classes, db.sync_queue], async () => {
            await db.classes.update(classId, { archived });
            await queueAction('classes', 'update', { id: classId, archived });
        });
        
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
      updateClassNotes,
      renameLearner
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