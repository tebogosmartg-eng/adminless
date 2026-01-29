import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { defaultGradingScheme } from '@/utils/grading';
import { GradeSymbol } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';

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
  savedSubjects: string[];
  addSubject: (subject: string) => void;
  removeSubject: (subject: string) => void;
  savedGrades: string[];
  addGrade: (grade: string) => void;
  removeGrade: (grade: string) => void;
  updateProfileSettings: (updates: {
    schoolName?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
  }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  
  // Live Query for Profile
  const profile = useLiveQuery(
    () => session?.user.id ? db.profiles.get(session.user.id) : undefined,
    [session?.user.id]
  );

  // Local state initialized with defaults, updated when profile loads
  const [gradingScheme, setGradingSchemeState] = useState<GradeSymbol[]>(defaultGradingScheme);
  const [schoolName, setSchoolNameState] = useState<string>("My School");
  const [teacherName, setTeacherNameState] = useState<string>("");
  const [contactEmail, setContactEmailState] = useState<string>("");
  const [contactPhone, setContactPhoneState] = useState<string>("");
  const [schoolLogo, setSchoolLogoState] = useState<string | null>(null);
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(50);
  const [commentBank, setCommentBankState] = useState<string[]>([]);
  const [savedSubjects, setSavedSubjectsState] = useState<string[]>([]);
  const [savedGrades, setSavedGradesState] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
        // Critical Fix: Only update state if the value from DB is a valid array
        if (Array.isArray(profile.grading_scheme)) setGradingSchemeState(profile.grading_scheme);
        if (profile.school_name !== undefined) setSchoolNameState(profile.school_name || "My School");
        if (profile.teacher_name !== undefined) setTeacherNameState(profile.teacher_name || "");
        if (profile.contact_email !== undefined) setContactEmailState(profile.contact_email || "");
        if (profile.contact_phone !== undefined) setContactPhoneState(profile.contact_phone || "");
        if (profile.school_logo !== undefined) setSchoolLogoState(profile.school_logo || null);
        if (profile.at_risk_threshold !== undefined) setAtRiskThresholdState(profile.at_risk_threshold ?? 50);
        if (Array.isArray(profile.comment_bank)) setCommentBankState(profile.comment_bank);
        if (Array.isArray(profile.subjects)) setSavedSubjectsState(profile.subjects);
        if (Array.isArray(profile.grades)) setSavedGradesState(profile.grades);
    }
  }, [profile]);

  const updateProfile = async (updates: any) => {
    if (!session?.user.id) return;

    // 1. Update Local DB (Upsert)
    const current = await db.profiles.get(session.user.id) || { id: session.user.id };
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    
    await db.profiles.put(updated);

    // 2. Queue Sync
    await queueAction('profiles', 'upsert', updated);
  };

  const updateProfileSettings = async (updates: {
    schoolName?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
  }) => {
    if (!session?.user.id) return;

    // Map keys to DB field names
    const dbUpdates: any = {};
    if (updates.schoolName !== undefined) dbUpdates.school_name = updates.schoolName;
    if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
    if (updates.atRiskThreshold !== undefined) dbUpdates.at_risk_threshold = updates.atRiskThreshold;

    // Update local state immediately for snappy UI
    if (updates.schoolName !== undefined) setSchoolNameState(updates.schoolName);
    if (updates.teacherName !== undefined) setTeacherNameState(updates.teacherName);
    if (updates.contactEmail !== undefined) setContactEmailState(updates.contactEmail);
    if (updates.contactPhone !== undefined) setContactPhoneState(updates.contactPhone);
    if (updates.atRiskThreshold !== undefined) setAtRiskThresholdState(updates.atRiskThreshold);

    await updateProfile(dbUpdates);
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

  const addSubject = (subject: string) => {
    if (!savedSubjects.includes(subject)) {
      const newList = [...savedSubjects, subject].sort();
      setSavedSubjectsState(newList);
      updateProfile({ subjects: newList });
    }
  };

  const removeSubject = (subject: string) => {
    const newList = savedSubjects.filter(s => s !== subject);
    setSavedSubjectsState(newList);
    updateProfile({ subjects: newList });
  };

  const addGrade = (grade: string) => {
    if (!savedGrades.includes(grade)) {
      const newList = [...savedGrades, grade].sort((a, b) => {
         return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
      setSavedGradesState(newList);
      updateProfile({ grades: newList });
    }
  };

  const removeGrade = (grade: string) => {
    const newList = savedGrades.filter(g => g !== grade);
    setSavedGradesState(newList);
    updateProfile({ grades: newList });
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
      removeFromCommentBank,
      savedSubjects,
      addSubject,
      removeSubject,
      savedGrades,
      addGrade,
      removeGrade,
      updateProfileSettings
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