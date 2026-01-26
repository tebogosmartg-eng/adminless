import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { defaultGradingScheme } from '@/utils/grading';
import { GradeSymbol } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface SettingsContextType {
  gradingScheme: GradeSymbol[];
  updateGradingScheme: (newScheme: GradeSymbol[]) => void;
  resetGradingScheme: () => void;
  schoolName: string;
  setSchoolName: (name: string) => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
  contactEmail: string;
  setContactEmail: (email: string) => void;
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  schoolLogo: string | null;
  setSchoolLogo: (logo: string | null) => void;
  atRiskThreshold: number;
  setAtRiskThreshold: (threshold: number) => void;
  commentBank: string[];
  addToCommentBank: (comment: string) => void;
  removeFromCommentBank: (comment: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  
  const [gradingScheme, setGradingSchemeState] = useState<GradeSymbol[]>(defaultGradingScheme);
  const [schoolName, setSchoolNameState] = useState<string>("My School");
  const [teacherName, setTeacherNameState] = useState<string>("");
  const [contactEmail, setContactEmailState] = useState<string>("");
  const [contactPhone, setContactPhoneState] = useState<string>("");
  const [schoolLogo, setSchoolLogoState] = useState<string | null>(null);
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(50);
  const [commentBank, setCommentBankState] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else if (data) {
        if (data.grading_scheme) setGradingSchemeState(data.grading_scheme as unknown as GradeSymbol[]);
        if (data.school_name) setSchoolNameState(data.school_name);
        if (data.teacher_name) setTeacherNameState(data.teacher_name);
        if (data.contact_email) setContactEmailState(data.contact_email);
        if (data.contact_phone) setContactPhoneState(data.contact_phone);
        if (data.school_logo) setSchoolLogoState(data.school_logo);
        if (data.at_risk_threshold) setAtRiskThresholdState(data.at_risk_threshold);
        if (data.comment_bank) setCommentBankState(data.comment_bank as unknown as string[]);
      }
    };

    fetchSettings();
  }, [session?.user.id]);

  const updateProfile = async (updates: any) => {
    if (!session?.user.id) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Error updating profile:', error);
    }
  };

  const updateGradingScheme = (newScheme: GradeSymbol[]) => {
    setGradingSchemeState(newScheme);
    updateProfile({ grading_scheme: newScheme });
    logActivity("Updated grading scheme configuration");
  };

  const resetGradingScheme = () => {
    setGradingSchemeState(defaultGradingScheme);
    updateProfile({ grading_scheme: defaultGradingScheme });
    logActivity("Reset grading scheme to defaults");
  };

  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    updateProfile({ school_name: name });
  };

  const setTeacherName = (name: string) => {
    setTeacherNameState(name);
    updateProfile({ teacher_name: name });
  };

  const setContactEmail = (email: string) => {
    setContactEmailState(email);
    updateProfile({ contact_email: email });
  };

  const setContactPhone = (phone: string) => {
    setContactPhoneState(phone);
    updateProfile({ contact_phone: phone });
  };

  const setSchoolLogo = (logo: string | null) => {
    setSchoolLogoState(logo);
    updateProfile({ school_logo: logo });
  };

  const setAtRiskThreshold = (threshold: number) => {
    setAtRiskThresholdState(threshold);
    updateProfile({ at_risk_threshold: threshold });
  };

  const addToCommentBank = (comment: string) => {
    if (!commentBank.includes(comment)) {
      const newBank = [...commentBank, comment];
      setCommentBankState(newBank);
      updateProfile({ comment_bank: newBank });
    }
  };

  const removeFromCommentBank = (comment: string) => {
    const newBank = commentBank.filter(c => c !== comment);
    setCommentBankState(newBank);
    updateProfile({ comment_bank: newBank });
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
      contactEmail,
      setContactEmail,
      contactPhone,
      setContactPhone,
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