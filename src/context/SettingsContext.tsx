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
  commentBank: string[];
  addToCommentBank: (comment: string) => void;
  removeFromCommentBank: (comment: string) => void;
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

  // Comment Bank State
  const [commentBank, setCommentBank] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('comment_bank');
      return saved ? JSON.parse(saved) : [
        "Excellent work!",
        "Good effort, keep it up.",
        "Please ensure homework is submitted on time.",
        "Significant improvement shown.",
        "Struggling with core concepts, please see me."
      ];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('grading_scheme', JSON.stringify(gradingScheme));
  }, [gradingScheme]);

  useEffect(() => {
    localStorage.setItem('comment_bank', JSON.stringify(commentBank));
  }, [commentBank]);

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
      }
    } else {
      localStorage.removeItem('school_logo');
    }
  };

  const setAtRiskThreshold = (threshold: number) => {
    setAtRiskThresholdState(threshold);
    localStorage.setItem('at_risk_threshold', threshold.toString());
  };

  const addToCommentBank = (comment: string) => {
    if (!commentBank.includes(comment)) {
      setCommentBank(prev => [...prev, comment]);
      showSuccess("Added to comment bank.");
    }
  };

  const removeFromCommentBank = (comment: string) => {
    setCommentBank(prev => prev.filter(c => c !== comment));
  };
  
  // Helper for toast (circular dependency workaround if needed, but imported directly here)
  const showSuccess = (msg: string) => {
    // We can't import showSuccess from utils/toast here easily if it causes cycles, 
    // but since utils/toast doesn't import context, it's fine.
    // However, sticking to context pure logic is better.
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
      setAtRiskThreshold,
      commentBank,
      addToCommentBank,
      removeFromCommentBank
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