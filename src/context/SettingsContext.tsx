import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { defaultGradingScheme } from '@/utils/grading';
import { GradeSymbol } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError } from '@/utils/toast';
import { PASS_THRESHOLD } from '@/constants/diagnostics';

interface SettingsContextType {
  gradingScheme: GradeSymbol[];
  updateGradingScheme: (newScheme: GradeSymbol[]) => Promise<void>;
  resetGradingScheme: () => Promise<void>;
  schoolName: string;
  setSchoolName: (name: string) => Promise<void>;
  schoolCode: string;
  setSchoolCode: (code: string) => Promise<void>;
  saceNumber: string;
  setSaceNumber: (num: string) => Promise<void>;
  teacherName: string;
  setTeacherName: (name: string) => Promise<void>;
  contactEmail: string;
  setContactEmail: (email: string) => Promise<void>;
  contactPhone: string;
  setContactPhone: (phone: string) => Promise<void>;
  schoolLogo: string | null;
  setSchoolLogo: (logo: string | null) => Promise<void>;
  atRiskThreshold: number;
  setAtRiskThreshold: (threshold: number) => Promise<void>;
  commentBank: string[];
  addToCommentBank: (comment: string) => Promise<void>;
  removeFromCommentBank: (comment: string) => Promise<void>;
  savedSubjects: string[];
  addSubject: (subject: string) => Promise<void>;
  removeSubject: (subject: string) => Promise<void>;
  savedGrades: string[];
  addGrade: (grade: string) => Promise<void>;
  removeGrade: (grade: string) => Promise<void>;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => Promise<void>;
  updateProfileSettings: (updates: {
    schoolName?: string;
    schoolCode?: string;
    saceNumber?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
    onboardingCompleted?: boolean;
  }) => Promise<void>;
  hasProfile: boolean;
  isLoadingProfile: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_DBE_SUBJECTS = [
  "English Home Language", "English First Additional Language", "Afrikaans Huistaal", 
  "Afrikaans Eerste Addisionele Taal", "Mathematics", "Mathematical Literacy", 
  "Life Orientation", "Natural Sciences", "Social Sciences", 
  "Economic and Management Sciences", "Life Sciences", "Physical Sciences", 
  "History", "Geography", "Accounting", "Business Studies", "Economics", 
  "Tourism", "Computer Applications Technology", "Information Technology"
];

export const SettingsProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { logActivity } = useActivity();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
        if (!session?.user?.id) return null;
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (error && error.code !== 'PGRST116') throw error; // ignore not found
        return data;
    },
    enabled: !!session?.user?.id
  });

  const [gradingScheme, setGradingSchemeState] = useState<GradeSymbol[]>(defaultGradingScheme);
  const [schoolName, setSchoolNameState] = useState<string>("My School");
  const [schoolCode, setSchoolCodeState] = useState<string>("");
  const [saceNumber, setSaceNumberState] = useState<string>("");
  const [teacherName, setTeacherNameState] = useState<string>("");
  const [contactEmail, setContactEmailState] = useState<string>("");
  const [contactPhone, setContactPhoneState] = useState<string>("");
  const [schoolLogo, setSchoolLogoState] = useState<string | null>(null);
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(PASS_THRESHOLD);
  const [commentBank, setCommentBankState] = useState<string[]>([]);
  const [savedSubjects, setSavedSubjectsState] = useState<string[]>(DEFAULT_DBE_SUBJECTS);
  const [savedGrades, setSavedGradesState] = useState<string[]>([]);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(true); // Default to true while loading to prevent flashes

  const bootstrapProfile = useCallback(async () => {
    if (!session?.user) return;
    
    const { data: existing, error } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', session.user.id)
        .single();

    if (error || !existing) {
        console.log("[Bootstrap] Profile not found. Creating minimal row...");
        
        // Smart Check: Does this user already have classes in the database?
        const { count } = await supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
        const hasExistingData = (count || 0) > 0;

        const newProfile = {
            id: session.user.id,
            contact_email: session.user.email,
            onboarding_completed: hasExistingData, // Bypass onboarding if they have data
            updated_at: new Date().toISOString()
        };
        
        await supabase.from('profiles').upsert(newProfile);
        setOnboardingCompletedState(hasExistingData);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  }, [session?.user, queryClient]);

  useEffect(() => {
    if (session?.user) bootstrapProfile();
  }, [session?.user, bootstrapProfile]);

  useEffect(() => {
    if (profile) {
        if (Array.isArray(profile.grading_scheme)) setGradingSchemeState(profile.grading_scheme);
        if (profile.school_name !== undefined) setSchoolNameState(profile.school_name || "My School");
        if (profile.school_code !== undefined) setSchoolCodeState(profile.school_code || "");
        if (profile.sace_number !== undefined) setSaceNumberState(profile.sace_number || "");
        if (profile.teacher_name !== undefined) setTeacherNameState(profile.teacher_name || "");
        if (profile.contact_email !== undefined) setContactEmailState(profile.contact_email || "");
        if (profile.contact_phone !== undefined) setContactPhoneState(profile.contact_phone || "");
        if (profile.school_logo !== undefined) setSchoolLogoState(profile.school_logo || null);
        if (profile.at_risk_threshold !== undefined) setAtRiskThresholdState(profile.at_risk_threshold ?? PASS_THRESHOLD);
        if (Array.isArray(profile.comment_bank)) setCommentBankState(profile.comment_bank);
        if (Array.isArray(profile.subjects) && profile.subjects.length > 0) setSavedSubjectsState(profile.subjects);
        if (Array.isArray(profile.grades)) setSavedGradesState(profile.grades);
        
        if (profile.onboarding_completed !== undefined && profile.onboarding_completed !== null) {
            setOnboardingCompletedState(profile.onboarding_completed);
        } else {
            setOnboardingCompletedState(true);
        }
    }
  }, [profile]);

  const updateProfile = async (updates: any) => {
    if (!session?.user.id) return;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    console.log("[SettingsContext.updateProfile] user.id:", session.user.id);
    console.log("[SettingsContext.updateProfile] payload:", payload);

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', session.user.id)
      .select();

    console.log("[SettingsContext.updateProfile] supabase response:", { data, error });

    if (error) {
      console.error(error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const updateProfileSettings = async (updates: {
    schoolName?: string;
    schoolCode?: string;
    saceNumber?: string;
    teacherName?: string;
    contactEmail?: string;
    contactPhone?: string;
    atRiskThreshold?: number;
    onboardingCompleted?: boolean;
  }) => {
    if (!session?.user.id) return;
    const dbUpdates: any = {};
    const normalizedSchoolName = updates.schoolName !== undefined ? (updates.schoolName || null) : undefined;
    const normalizedSchoolCode = updates.schoolCode !== undefined ? (updates.schoolCode || null) : undefined;
    const normalizedSaceNumber = updates.saceNumber !== undefined ? (updates.saceNumber || null) : undefined;
    const normalizedTeacherName = updates.teacherName !== undefined ? (updates.teacherName || null) : undefined;
    const normalizedContactEmail = updates.contactEmail !== undefined ? (updates.contactEmail || null) : undefined;
    const normalizedContactPhone = updates.contactPhone !== undefined ? (updates.contactPhone || null) : undefined;

    if (normalizedSchoolName !== undefined) dbUpdates.school_name = normalizedSchoolName;
    if (normalizedSchoolCode !== undefined) dbUpdates.school_code = normalizedSchoolCode;
    if (normalizedSaceNumber !== undefined) dbUpdates.sace_number = normalizedSaceNumber;
    if (normalizedTeacherName !== undefined) dbUpdates.teacher_name = normalizedTeacherName;
    if (normalizedContactEmail !== undefined) dbUpdates.contact_email = normalizedContactEmail;
    if (normalizedContactPhone !== undefined) dbUpdates.contact_phone = normalizedContactPhone;
    if (updates.atRiskThreshold !== undefined) dbUpdates.at_risk_threshold = updates.atRiskThreshold;
    if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;

    console.log("[SettingsContext.updateProfileSettings] user.id:", session.user.id);
    console.log("[SettingsContext.updateProfileSettings] payload:", dbUpdates);
    await updateProfile(dbUpdates);

    if (normalizedSchoolName !== undefined) setSchoolNameState(normalizedSchoolName || "My School");
    if (normalizedSchoolCode !== undefined) setSchoolCodeState(normalizedSchoolCode || "");
    if (normalizedSaceNumber !== undefined) setSaceNumberState(normalizedSaceNumber || "");
    if (normalizedTeacherName !== undefined) setTeacherNameState(normalizedTeacherName || "");
    if (normalizedContactEmail !== undefined) setContactEmailState(normalizedContactEmail || "");
    if (normalizedContactPhone !== undefined) setContactPhoneState(normalizedContactPhone || "");
    if (updates.atRiskThreshold !== undefined) setAtRiskThresholdState(updates.atRiskThreshold);
    if (updates.onboardingCompleted !== undefined) setOnboardingCompletedState(updates.onboardingCompleted);
  };

  const persistProfile = async (updates: Record<string, unknown>) => {
    try {
      await updateProfile(updates);
    } catch (error) {
      console.error("Settings update failed:", error);
      showError("Failed - Retry");
      throw error;
    }
  };

  const updateGradingScheme = async (newScheme: GradeSymbol[]) => {
    const previousScheme = gradingScheme;
    setGradingSchemeState(newScheme);
    try {
      await persistProfile({ grading_scheme: newScheme });
      logActivity("Updated grading scheme configuration");
    } catch (error) {
      setGradingSchemeState(previousScheme);
      throw error;
    }
  };

  const resetGradingScheme = async () => {
    const previousScheme = gradingScheme;
    setGradingSchemeState(defaultGradingScheme);
    try {
      await persistProfile({ grading_scheme: defaultGradingScheme });
      logActivity("Reset grading scheme to defaults");
    } catch (error) {
      setGradingSchemeState(previousScheme);
      throw error;
    }
  };

  const setSchoolName = async (name: string) => {
    const previous = schoolName;
    setSchoolNameState(name);
    try {
      await persistProfile({ school_name: name });
    } catch (error) {
      setSchoolNameState(previous);
      throw error;
    }
  };

  const setSchoolCode = async (code: string) => {
    const previous = schoolCode;
    setSchoolCodeState(code);
    try {
      await persistProfile({ school_code: code });
    } catch (error) {
      setSchoolCodeState(previous);
      throw error;
    }
  };

  const setSaceNumber = async (num: string) => {
    const previous = saceNumber;
    setSaceNumberState(num);
    try {
      await persistProfile({ sace_number: num });
    } catch (error) {
      setSaceNumberState(previous);
      throw error;
    }
  };

  const setTeacherName = async (name: string) => {
    const previous = teacherName;
    setTeacherNameState(name);
    try {
      await persistProfile({ teacher_name: name });
    } catch (error) {
      setTeacherNameState(previous);
      throw error;
    }
  };

  const setContactEmail = async (email: string) => {
    const previous = contactEmail;
    setContactEmailState(email);
    try {
      await persistProfile({ contact_email: email });
    } catch (error) {
      setContactEmailState(previous);
      throw error;
    }
  };

  const setContactPhone = async (phone: string) => {
    const previous = contactPhone;
    setContactPhoneState(phone);
    try {
      await persistProfile({ contact_phone: phone });
    } catch (error) {
      setContactPhoneState(previous);
      throw error;
    }
  };

  const setSchoolLogo = async (logo: string | null) => {
    const previous = schoolLogo;
    setSchoolLogoState(logo);
    try {
      await persistProfile({ school_logo: logo });
    } catch (error) {
      setSchoolLogoState(previous);
      throw error;
    }
  };

  const setAtRiskThreshold = async (threshold: number) => {
    const previous = atRiskThreshold;
    setAtRiskThresholdState(threshold);
    try {
      await persistProfile({ at_risk_threshold: threshold });
    } catch (error) {
      setAtRiskThresholdState(previous);
      throw error;
    }
  };

  const setOnboardingCompleted = async (val: boolean) => {
    const previous = onboardingCompleted;
    setOnboardingCompletedState(val);
    try {
      await persistProfile({ onboarding_completed: val });
    } catch (error) {
      setOnboardingCompletedState(previous);
      throw error;
    }
  };

  const addToCommentBank = async (comment: string) => {
    if (!commentBank.includes(comment)) {
      const previous = commentBank;
      const newBank = [...commentBank, comment];
      setCommentBankState(newBank);
      try {
        await persistProfile({ comment_bank: newBank });
      } catch (error) {
        setCommentBankState(previous);
        throw error;
      }
    }
  };

  const removeFromCommentBank = async (comment: string) => {
    const previous = commentBank;
    const newBank = commentBank.filter(c => c !== comment);
    setCommentBankState(newBank);
    try {
      await persistProfile({ comment_bank: newBank });
    } catch (error) {
      setCommentBankState(previous);
      throw error;
    }
  };

  const addSubject = async (subject: string) => {
    if (!savedSubjects.includes(subject)) {
      const previous = savedSubjects;
      const newList = [...savedSubjects, subject].sort();
      setSavedSubjectsState(newList);
      try {
        await persistProfile({ subjects: newList });
      } catch (error) {
        setSavedSubjectsState(previous);
        throw error;
      }
    }
  };

  const removeSubject = async (subject: string) => {
    const previous = savedSubjects;
    const newList = savedSubjects.filter(s => s !== subject);
    setSavedSubjectsState(newList);
    try {
      await persistProfile({ subjects: newList });
    } catch (error) {
      setSavedSubjectsState(previous);
      throw error;
    }
  };

  const addGrade = async (grade: string) => {
    if (!savedGrades.includes(grade)) {
      const previous = savedGrades;
      const newList = [...savedGrades, grade].sort((a, b) => {
         return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
      setSavedGradesState(newList);
      try {
        await persistProfile({ grades: newList });
      } catch (error) {
        setSavedGradesState(previous);
        throw error;
      }
    }
  };

  const removeGrade = async (grade: string) => {
    const previous = savedGrades;
    const newList = savedGrades.filter(g => g !== grade);
    setSavedGradesState(newList);
    try {
      await persistProfile({ grades: newList });
    } catch (error) {
      setSavedGradesState(previous);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      gradingScheme, updateGradingScheme, resetGradingScheme,
      schoolName, setSchoolName, schoolCode, setSchoolCode, saceNumber, setSaceNumber,
      teacherName, setTeacherName, contactEmail, setContactEmail,
      contactPhone, setContactPhone, schoolLogo, setSchoolLogo,
      atRiskThreshold, setAtRiskThreshold, commentBank,
      addToCommentBank, removeFromCommentBank,
      savedSubjects, addSubject, removeSubject,
      savedGrades, addGrade, removeGrade,
      onboardingCompleted, setOnboardingCompleted,
      updateProfileSettings,
      hasProfile: !!profile,
      isLoadingProfile: isProfileLoading
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