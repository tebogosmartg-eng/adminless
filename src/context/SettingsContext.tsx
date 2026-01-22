import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GradeSymbol, defaultGradingScheme } from '@/utils/grading';
import { useActivity } from './ActivityContext';

interface SettingsContextType {
  gradingScheme: GradeSymbol[];
  updateGradingScheme: (newScheme: GradeSymbol[]) => void;
  resetGradingScheme: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  schoolName: string;
  setSchoolName: (name: string) => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
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

  // API Key State
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || "";
  });

  // School Profile State
  const [schoolName, setSchoolNameState] = useState<string>(() => {
    return localStorage.getItem('school_name') || "My School";
  });

  const [teacherName, setTeacherNameState] = useState<string>(() => {
    return localStorage.getItem('teacher_name') || "";
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

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    localStorage.setItem('school_name', name);
  };

  const setTeacherName = (name: string) => {
    setTeacherNameState(name);
    localStorage.setItem('teacher_name', name);
  };

  return (
    <SettingsContext.Provider value={{ 
      gradingScheme, 
      updateGradingScheme, 
      resetGradingScheme,
      apiKey,
      setApiKey,
      schoolName,
      setSchoolName,
      teacherName,
      setTeacherName
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