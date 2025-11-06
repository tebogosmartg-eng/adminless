import { createContext, useContext, useState, ReactNode } from 'react';
import { ClassInfo, Learner } from '../components/CreateClassDialog';

interface ClassesContextType {
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
  updateClass: (classId: string, updatedLearners: Learner[]) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const addClass = (newClass: ClassInfo) => {
    setClasses((prevClasses) => [...prevClasses, newClass]);
  };

  const updateClass = (classId: string, updatedLearners: Learner[]) => {
    setClasses((prevClasses) =>
      prevClasses.map((c) =>
        c.id === classId ? { ...c, learners: updatedLearners } : c
      )
    );
  };

  return (
    <ClassesContext.Provider value={{ classes, addClass, updateClass }}>
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