import { createContext, useContext, useState, ReactNode } from 'react';
import { ClassInfo } from '../components/CreateClassDialog';

interface ClassesContextType {
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const addClass = (newClass: ClassInfo) => {
    setClasses((prevClasses) => [...prevClasses, newClass]);
  };

  return (
    <ClassesContext.Provider value={{ classes, addClass }}>
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