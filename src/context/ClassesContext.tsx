import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ClassInfo, Learner } from '../components/CreateClassDialog';
import { useActivity } from './ActivityContext';

interface ClassesContextType {
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
  updateLearners: (classId: string, updatedLearners: Learner[]) => void;
  updateClassDetails: (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => void;
  deleteClass: (classId: string) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children }: { children: ReactNode }) => {
  const { logActivity } = useActivity();
  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    try {
      const savedClasses = localStorage.getItem('classes');
      return savedClasses ? JSON.parse(savedClasses) : [];
    } catch (error) {
      console.error("Failed to parse classes from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('classes', JSON.stringify(classes));
  }, [classes]);

  const addClass = (newClass: ClassInfo) => {
    setClasses((prevClasses) => [...prevClasses, newClass]);
    logActivity(`Created class: "${newClass.subject} - ${newClass.className}"`);
  };

  const updateLearners = (classId: string, updatedLearners: Learner[]) => {
    const classInfo = classes.find(c => c.id === classId);
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, learners: updatedLearners } : c
      )
    );
    if (classInfo) {
      logActivity(`Updated marks for class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  const updateClassDetails = (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, ...details } : c
      )
    );
    const classInfo = classes.find(c => c.id === classId);
     if (classInfo) {
      logActivity(`Edited details for class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  const deleteClass = (classId: string) => {
    const classInfo = classes.find(c => c.id === classId);
    setClasses((prevClasses) => prevClasses.filter((c) => c.id !== classId));
     if (classInfo) {
      logActivity(`Deleted class: "${classInfo.subject} - ${classInfo.className}"`);
    }
  };

  return (
    <ClassesContext.Provider value={{ classes, addClass, updateLearners, updateClassDetails, deleteClass }}>
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