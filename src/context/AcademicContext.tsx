import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AcademicYear, Term, Assessment, AssessmentMark } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';

interface AcademicContextType {
  years: AcademicYear[];
  terms: Term[];
  assessments: Assessment[];
  marks: AssessmentMark[];
  loading: boolean;
  activeYear: AcademicYear | null;
  activeTerm: Term | null;
  setActiveYear: (year: AcademicYear | null) => void;
  setActiveTerm: (term: Term | null) => void;
  createYear: (name: string) => Promise<void>;
  updateTerm: (term: Term) => Promise<void>;
  createAssessment: (assessment: Omit<Assessment, 'id'>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  updateMarks: (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => Promise<void>;
  refreshAssessments: (classId: string, termId?: string) => Promise<void>;
  toggleTermStatus: (termId: string, closed: boolean) => Promise<void>;
  closeYear: (yearId: string) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [marks, setMarks] = useState<AssessmentMark[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);

  useEffect(() => {
    if (session?.user.id) {
      fetchYears();
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (activeYear) {
      fetchTerms(activeYear.id);
    }
  }, [activeYear]);

  const fetchYears = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('name', { ascending: false });
    
    if (error) {
      console.error(error);
    } else {
      setYears(data || []);
      const openYear = data?.find(y => !y.closed) || data?.[0];
      if (openYear) setActiveYear(openYear);
    }
    setLoading(false);
  };

  const fetchTerms = async (yearId: string) => {
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('year_id', yearId)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setTerms(data || []);
      const now = new Date().toISOString();
      const current = data?.find(t => t.start_date && t.end_date && now >= t.start_date && now <= t.end_date) || data?.[0];
      if (current) setActiveTerm(current);
    }
  };

  const createYear = async (name: string) => {
    if (!session?.user.id) return;
    
    const { data: year, error } = await supabase
      .from('academic_years')
      .insert([{ name, user_id: session.user.id, closed: false }])
      .select()
      .single();

    if (error) {
      showError('Failed to create year.');
      return;
    }

    const termsToCreate = ['Term 1', 'Term 2', 'Term 3', 'Term 4'].map(tName => ({
      year_id: year.id,
      name: tName,
      user_id: session.user.id,
      closed: false,
      weight: 25
    }));

    const { error: termError } = await supabase
      .from('terms')
      .insert(termsToCreate);

    if (termError) {
      console.error(termError);
      showError('Year created but failed to create terms.');
    } else {
      showSuccess(`Academic Year ${name} created.`);
      fetchYears();
    }
  };

  const updateTerm = async (term: Term) => {
     const { error } = await supabase
       .from('terms')
       .update({ 
         start_date: term.start_date, 
         end_date: term.end_date, 
         closed: term.closed,
         weight: term.weight
       })
       .eq('id', term.id);
     
     if (error) showError('Failed to update term.');
     else {
        setTerms(prev => prev.map(t => t.id === term.id ? term : t));
        showSuccess('Term updated.');
     }
  };
  
  const toggleTermStatus = async (termId: string, closed: boolean) => {
      const { error } = await supabase.from('terms').update({ closed }).eq('id', termId);
      if(error) showError("Failed to update status");
      else {
          setTerms(prev => prev.map(t => t.id === termId ? { ...t, closed } : t));
          if(activeTerm?.id === termId) setActiveTerm(prev => prev ? { ...prev, closed } : null);
          showSuccess(`Term ${closed ? 'closed' : 're-opened'}.`);
      }
  };

  const closeYear = async (yearId: string) => {
    const { data: openTerms, error: fetchError } = await supabase
        .from('terms')
        .select('id')
        .eq('year_id', yearId)
        .eq('closed', false);
    
    if (fetchError) {
        showError("Failed to verify terms.");
        return;
    }

    if (openTerms && openTerms.length > 0) {
        showError(`Cannot close year. ${openTerms.length} terms are still open.`);
        return;
    }

    const { error } = await supabase
        .from('academic_years')
        .update({ closed: true })
        .eq('id', yearId);

    if (error) {
        showError("Failed to close year.");
    } else {
        setYears(prev => prev.map(y => y.id === yearId ? { ...y, closed: true } : y));
        if (activeYear?.id === yearId) setActiveYear(prev => prev ? { ...prev, closed: true } : null);
        showSuccess("Academic Year finalized and closed.");
    }
  };

  const refreshAssessments = async (classId: string, termId?: string) => {
    const targetTermId = termId || activeTerm?.id;
    if (!targetTermId) return;

    const { data: assData, error: assError } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_id', classId)
      .eq('term_id', targetTermId);

    if (assError) console.error(assError);
    else setAssessments(assData || []);

    if (assData && assData.length > 0) {
        const assIds = assData.map((a: any) => a.id);
        const { data: marksData, error: marksError } = await supabase
            .from('assessment_marks')
            .select('*')
            .in('assessment_id', assIds);
        
        if (marksError) console.error(marksError);
        else setMarks(marksData || []);
    } else {
        setMarks([]);
    }
  };

  const createAssessment = async (assessment: Omit<Assessment, 'id'>) => {
    if (!session?.user.id) return;
    const { error } = await supabase
        .from('assessments')
        .insert([{ ...assessment, user_id: session.user.id }]);
    
    if (error) showError("Failed to create assessment.");
    else {
        showSuccess("Assessment created.");
        refreshAssessments(assessment.class_id, assessment.term_id);
    }
  };

  const deleteAssessment = async (id: string) => {
      const ass = assessments.find(a => a.id === id);
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if(error) showError("Failed to delete.");
      else {
          showSuccess("Assessment deleted.");
          if(ass) refreshAssessments(ass.class_id, ass.term_id);
      }
  };

  const updateMarks = async (updates: { assessment_id: string; learner_id: string; score: number | null; comment?: string }[]) => {
    if (!session?.user.id) return;
    
    const toUpsert = updates.map(u => ({
        assessment_id: u.assessment_id,
        learner_id: u.learner_id,
        score: u.score,
        comment: u.comment,
        user_id: session.user.id
    }));

    const { error } = await supabase
        .from('assessment_marks')
        .upsert(toUpsert, { onConflict: 'assessment_id,learner_id' });

    if (error) {
        console.error(error);
        showError("Failed to save marks.");
    } else {
        const newMarks = [...marks];
        toUpsert.forEach(u => {
            const idx = newMarks.findIndex(m => m.assessment_id === u.assessment_id && m.learner_id === u.learner_id);
            if (idx >= 0) {
                // Merge updates
                newMarks[idx] = { 
                    ...newMarks[idx], 
                    score: u.score,
                    // Only update comment if provided (allow partial updates in theory, though we usually pass both)
                    ...(u.comment !== undefined ? { comment: u.comment } : {}) 
                };
            } else {
                newMarks.push({ id: 'temp-' + Date.now(), ...u } as AssessmentMark);
            }
        });
        setMarks(newMarks);
        showSuccess("Saved successfully.");
    }
  };

  return (
    <AcademicContext.Provider value={{
      years,
      terms,
      assessments,
      marks,
      loading,
      activeYear,
      activeTerm,
      setActiveYear,
      setActiveTerm,
      createYear,
      updateTerm,
      createAssessment,
      deleteAssessment,
      updateMarks,
      refreshAssessments,
      toggleTermStatus,
      closeYear
    }}>
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};