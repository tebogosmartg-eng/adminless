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
  schoolCode: string;
  setSchoolCode: (code: string) => void;
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
    schoolCode?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
  }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_DBE_SUBJECTS = [
  "English Home Language",
  "English First Additional Language",
  "Afrikaans Huistaal",
  "Afrikaans Eerste Addisionele Taal",
  "Mathematics",
  "Mathematical Literacy",
  "Life Orientation",
  "Natural Sciences",
  "Social Sciences",
  "Economic and Management Sciences",
  "Life Sciences",
  "Physical Sciences",
  "History",
  "Geography",
  "Accounting",
  "Business Studies",
  "Economics",
  "Tourism",
  "Computer Applications Technology",
  "Information Technology"
];

export const SettingsProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  
  const profile = useLiveQuery(
    () => session?.user.id ? db.profiles.get(session.user.id) : undefined,
    [session?.user.id]
  );

  const [gradingScheme, setGradingSchemeState] = useState<GradeSymbol[]>(defaultGradingScheme);
  const [schoolName, setSchoolNameState] = useState<string>("My School");
  const [schoolCode, setSchoolCodeState] = useState<string>("");
  const [teacherName, setTeacherNameState] = useState<string>("");
  const [contactEmail, setContactEmailState] = useState<string>("");
  const [contactPhone, setContactPhoneState] = useState<string>("");
  const [schoolLogo, setSchoolLogoState] = useState<string | null>(null);
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(50);
  const [commentBank, setCommentBankState] = useState<string[]>([]);
  const [savedSubjects, setSavedSubjectsState] = useState<string[]>(DEFAULT_DBE_SUBJECTS);
  const [savedGrades, setSavedGradesState] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
        if (Array.isArray(profile.grading_scheme)) setGradingSchemeState(profile.grading_scheme);
        if (profile.school_name !== undefined) setSchoolNameState(profile.school_name || "My School");
        if (profile.school_code !== undefined) setSchoolCodeState(profile.school_code || "");
        if (profile.teacher_name !== undefined) setTeacherNameState(profile.teacher_name || "");
        if (profile.contact_email !== undefined) setContactEmailState(profile.contact_email || "");
        if (profile.contact_phone !== undefined) setContactPhoneState(profile.contact_phone || "");
        if (profile.school_logo !== undefined) setSchoolLogoState(profile.school_logo || null);
        if (profile.at_risk_threshold !== undefined) setAtRiskThresholdState(profile.at_risk_threshold ?? 50);
        if (Array.isArray(profile.comment_bank)) setCommentBankState(profile.comment_bank);
        if (Array.isArray(profile.subjects) && profile.subjects.length > 0) setSavedSubjectsState(profile.subjects);
        if (Array.isArray(profile.grades)) setSavedGradesState(profile.grades);
    }
  }, [profile]);

  const updateProfile = async (updates: any) => {
    if (!session?.user.id) return;
    const current = await db.profiles.get(session.user.id) || { id: session.user.id };
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    await db.profiles.put(updated);
    await queueAction('profiles', 'upsert', updated);
  };

  const updateProfileSettings = async (updates: {
    schoolName?: string;
    schoolCode?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
  }) => {
    if (!session?.user.id) return;
    const dbUpdates: any = {};
    if (updates.schoolName !== undefined) dbUpdates.school_name = updates.schoolName;
    if (updates.schoolCode !== undefined) dbUpdates.school_code = updates.schoolCode;
    if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
    if (updates.atRiskThreshold !== undefined) dbUpdates.at_risk_threshold = updates.atRiskThreshold;

    if (updates.schoolName !== undefined) setSchoolNameState(updates.schoolName);
    if (updates.schoolCode !== undefined) setSchoolCodeState(updates.schoolCode);
    if (updates.teacherName !== undefined) setTeacherNameState(updates.teacherName);
    if (updates.contactEmail !== undefined) setContactEmailState(updates.contactEmail);
    if (updates.contactPhone !== undefined) setContactPhoneState(updates.contactPhone);
    if (updates.atRiskThreshold !== undefined) setAtRiskThresholdState(updates.atRiskThreshold);

    await updateProfile(dbUpdates);
  };

  const updateGradingScheme = (newScheme: GradeSymbol[]) => {
    setGradingSchemeState(newScheme);
    updateProfile({ grading_scheme: newScheme });
  };

  const resetGradingScheme = () => {
    setGradingSchemeState(defaultGradingScheme);
    updateProfile({ grading_scheme: defaultGradingScheme });
  };

  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    updateProfile({ school_name: name });
  };

  const setSchoolCode = (code: string) => {
    setSchoolCodeState(code);
    updateProfile({ school_code: code });
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
      schoolCode,
      setSchoolCode,
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