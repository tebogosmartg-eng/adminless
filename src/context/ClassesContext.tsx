import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ClassInfo, Learner } from '../components/CreateClassDialog';

interface ClassesContextType {
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
  updateLearners: (classId: string, updatedLearners: Learner[]) => void;
  updateClassDetails: (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => void;
  deleteClass: (classId: string) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children }: { children: ReactNode }) => {
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
  };

  const updateLearners = (classId: string, updatedLearners: Learner[]) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, learners: updatedLearners } : c
      )
    );
  };

  const updateClassDetails = (classId: string, details: Partial<Omit<ClassInfo, 'id' | 'learners'>>) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, ...details } : c
      )
    );
  };

  const deleteClass = (classId: string) => {
    setClasses((prevClasses) => prevClasses.filter((c) => c.id !== classId));
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