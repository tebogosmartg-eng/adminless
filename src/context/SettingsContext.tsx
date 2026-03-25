import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { defaultGradingScheme } from '@/utils/grading';
import { GradeSymbol } from '@/lib/types';
import { useActivity } from './ActivityContext';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SettingsContextType {
  gradingScheme: GradeSymbol[];
  updateGradingScheme: (newScheme: GradeSymbol[]) => void;
  resetGradingScheme: () => void;
  schoolName: string;
  setSchoolName: (name: string) => void;
  schoolCode: string;
  setSchoolCode: (code: string) => void;
  saceNumber: string;
  setSaceNumber: (num: string) => void;
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
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;
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
  const [atRiskThreshold, setAtRiskThresholdState] = useState<number>(50);
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
        if (profile.at_risk_threshold !== undefined) setAtRiskThresholdState(profile.at_risk_threshold ?? 50);
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
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() });
    if (error) console.error("Failed to update profile", error);
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
    if (updates.schoolName !== undefined) dbUpdates.school_name = updates.schoolName;
    if (updates.schoolCode !== undefined) dbUpdates.school_code = updates.schoolCode;
    if (updates.saceNumber !== undefined) dbUpdates.sace_number = updates.saceNumber;
    if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
    if (updates.atRiskThreshold !== undefined) dbUpdates.at_risk_threshold = updates.atRiskThreshold;
    if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;

    if (updates.schoolName !== undefined) setSchoolNameState(updates.schoolName);
    if (updates.schoolCode !== undefined) setSchoolCodeState(updates.schoolCode || "");
    if (updates.saceNumber !== undefined) setSaceNumberState(updates.saceNumber || "");
    if (updates.teacherName !== undefined) setTeacherNameState(updates.teacherName);
    if (updates.contactEmail !== undefined) setContactEmailState(updates.contactEmail);
    if (updates.contactPhone !== undefined) setContactPhoneState(updates.contactPhone);
    if (updates.atRiskThreshold !== undefined) setAtRiskThresholdState(updates.atRiskThreshold);
    if (updates.onboardingCompleted !== undefined) setOnboardingCompletedState(updates.onboardingCompleted);

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

  const setSchoolCode = (code: string) => {
    setSchoolCodeState(code);
    updateProfile({ school_code: code });
  };

  const setSaceNumber = (num: string) => {
    setSaceNumberState(num);
    updateProfile({ sace_number: num });
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

  const setOnboardingCompleted = (val: boolean) => {
    setOnboardingCompletedState(val);
    updateProfile({ onboarding_completed: val });
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