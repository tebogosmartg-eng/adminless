import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GradeSymbol, defaultGradingScheme } from '@/utils/grading';
import { useActivity } from './ActivityContext';

interface SettingsContextType {
  gradingScheme: GradeSymbol[];
  updateGradingScheme: (newScheme: GradeSymbol[]) => void;
  resetGradingScheme: () => void;
  schoolName: string;
  setSchoolName: (name: string) => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
  atRiskThreshold: number;
  setAtRiskThreshold: (threshold: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { logActivity } = useActivity();
  
  // Grading Scheme State
  const [gradingScheme, setGradingScheme] = useState<GradeSymbol[]>(() => {
    try {
      const saved = localStorage.getItem('grading_scheme');
      return saved ? JSON.parse(saved) : defaultGradingScheme;
    } catch (error) {
      console.error("Failed to parse grading scheme", error);
      return defaultGradingScheme;
    }
  });

  // School Profile State
  const [schoolName, setSchoolNameState] = useState<string>(() => {
    return localStorage.getItem('school_name') || "My School";
  });

  const [teacherName, setTeacherNameState] = useState<string>(() => {
    return localStorage.getItem('teacher_name') || "";
  });

  // At Risk Threshold State
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(() => {
    const saved = localStorage.getItem('at_risk_threshold');
    return saved ? parseInt(saved, 10) : 50;
  });

  useEffect(() => {
    localStorage.setItem('grading_scheme', JSON.stringify(gradingScheme));
  }, [gradingScheme]);

  const updateGradingScheme = (newScheme: GradeSymbol[]) => {
    setGradingScheme(newScheme);
    logActivity("Updated grading scheme configuration");
  };

  const resetGradingScheme = () => {
    setGradingScheme(defaultGradingScheme);
    logActivity("Reset grading scheme to defaults");
  };

  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    localStorage.setItem('school_name', name);
  };

  const setTeacherName = (name: string) => {
    setTeacherNameState(name);
    localStorage.setItem('teacher_name', name);
  };

  const setAtRiskThreshold = (threshold: number) => {
    setAtRiskThresholdState(threshold);
    localStorage.setItem('at_risk_threshold', threshold.toString());
  };

  return (
    <SettingsContext.Provider value={{ 
      gradingScheme, 
      updateGradingScheme, 
      resetGradingScheme,
      schoolName,
      setSchoolName,
      teacherName,
      setTeacherName,
      atRiskThreshold,
      setAtRiskThreshold
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};