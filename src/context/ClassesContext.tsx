import { createContext, useContext, ReactNode, useRef, useEffect } from 'react';
import { ClassInfo, Learner } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademic } from './AcademicContext';

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
  const fetchCount = useRef(0);

  const rawClasses = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    
    fetchCount.current++;
    
    const userClasses = await db.classes
        .where('user_id')
        .equals(session.user.id)
        .toArray();
    
    if (!diagnosticMode && (!activeYear || !activeTerm)) {
        return undefined; 
    }

    const visibleClasses = userClasses.filter(c => {
        if (diagnosticMode) return true;
        return c.year_id === activeYear?.id && c.term_id === activeTerm?.id;
    });

    if (visibleClasses.length === 0) return [];

    const classIds = visibleClasses.map(c => c.id);
    const allLearners = await db.learners.where('class_id').anyOf(classIds).toArray();

    return visibleClasses.map(c => ({
        id: c.id,
        year_id: c.year_id,
        term_id: c.term_id,
        grade: c.grade,
        subject: c.subject,
        className: c.className || (c as any).class_name || "Untitled Class",
        archived: !!c.archived,
        notes: c.notes || '',
        is_finalised: !!c.is_finalised,
        learners: allLearners.filter(l => l.class_id === c.id)
    })) as ClassInfo[];
  }, [session?.user.id, activeYear?.id, activeTerm?.id, diagnosticMode]);

  const loading = rawClasses === undefined;
  const classes = rawClasses || [];

  const addClass = async (newClass: ClassInfo) => {
    if (!session?.user.id || !activeYear || !activeTerm) {
        showError("Academic context not loaded. Please select a Year and Term.");
        return;
    }

    try {
      const classData = {
        id: newClass.id, 
        user_id: session.user.id,
        year_id: activeYear.id,
        term_id: activeTerm.id,
        grade: newClass.grade,
        subject: newClass.subject,
        className: newClass.className, 
        archived: false,
        is_finalised: false,
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
              class_id: newClass.id,
              user_id: session.user.id
          }));

          await db.learners.bulkAdd(learnersWithIds as any);
          await queueAction('learners', 'create', learnersWithIds);
        }
      });

      logActivity(`Created class: "${newClass.className}" for ${activeTerm.name}`);
    } catch (e) {
      console.error(e);
      showError("Failed to create class.");
    }
  };

  const updateLearners = async (classId: string, updatedLearners: Learner[]) => {
    if (!session?.user.id) return;
    try {
        await db.transaction('rw', [db.learners, db.sync_queue], async () => {
            const currentDbLearners = await db.learners.where('class_id').equals(classId).toArray();
            const newIds = new Set();
            const toUpsert = [];

            for (const l of updatedLearners) {
                const id = l.id || crypto.randomUUID();
                newIds.add(id);
                toUpsert.push({
                    id,
                    class_id: classId,
                    user_id: session.user.id,
                    name: l.name,
                    mark: l.mark,
                    comment: l.comment
                });
            }

            const toDelete = currentDbLearners.filter(l => !newIds.has(l.id)).map(l => l.id!);
            if (toDelete.length > 0) await db.learners.bulkDelete(toDelete);
            await db.learners.bulkPut(toUpsert as any);

            if (toUpsert.length > 0) await queueAction('learners', 'upsert', toUpsert);
            if (toDelete.length > 0) {
                for (const id of toDelete) await queueAction('learners', 'delete', { id });
            }
        });
    } catch (e) {
        console.error(e);
        showError("Failed to update roster.");
    }
  };

  const renameLearner = async (learnerId: string, newName: string) => {
    try {
        await db.learners.update(learnerId, { name: newName });
        await queueAction('learners', 'update', { id: learnerId, name: newName });
    } catch (e) {
        showError("Failed to rename learner.");
    }
  };

  const updateClassDetails = async (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    try {
        const updates: any = {};
        if (details.grade) updates.grade = details.grade;
        if (details.subject) updates.subject = details.subject;
        if (details.className) updates.className = details.className;

        await db.classes.update(classId, updates);
        await queueAction('classes', 'update', { ...updates, id: classId });
    } catch (e) {
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

  const finalizeClassTerm = async (classId: string) => {
    try {
        await db.classes.update(classId, { is_finalised: true });
        await queueAction('classes', 'update', { id: classId, is_finalised: true });
        showSuccess("Class finalised successfully.");
        logActivity(`Finalised class term data.`);
    } catch (e) {
        showError("Failed to finalize class.");
    }
  };

  const deleteClass = async (classId: string) => {
    try {
        await db.transaction('rw', [db.classes, db.learners, db.sync_queue], async () => {
            await db.learners.where('class_id').equals(classId).delete();
            await db.classes.delete(classId);
            await queueAction('classes', 'delete', { id: classId });
        });
    } catch (e) {
        showError("Failed to delete class.");
    }
  };

  const toggleClassArchive = async (classId: string, archived: boolean) => {
    try {
        await db.classes.update(classId, { archived });
        await queueAction('classes', 'update', { id: classId, archived });
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