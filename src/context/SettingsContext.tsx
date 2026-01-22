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
  schoolLogo: string | null;
  setSchoolLogo: (logo: string | null) => void;
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

  // Logo State (Base64 string)
  const [schoolLogo, setSchoolLogoState] = useState<string | null>(() => {
    return localStorage.getItem('school_logo') || null;
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

  const setSchoolLogo = (logo: string | null) => {
    setSchoolLogoState(logo);
    if (logo) {
      try {
        localStorage.setItem('school_logo', logo);
      } catch (e) {
        console.error("Logo too large for localStorage", e);
        // Fallback or error handling could go here
      }
    } else {
      localStorage.removeItem('school_logo');
    }
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
      schoolLogo,
      setSchoolLogo,
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