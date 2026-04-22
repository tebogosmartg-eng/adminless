import { useState } from 'react';
import { Assessment, AssessmentMark, Learner, ClassInfo } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage } from '@/utils/calculations';
import { supabase } from '@/lib/supabaseClient';

interface TermReportResult {
  learnerName: string;
  className: string;
  assessments: { [title: string]: string }; 
  termAverage: number;
}

export const useTermReportData = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<TermReportResult[] | null>(null);
  const [allAssessmentTitles, setAllAssessmentTitles] = useState<string[]>([]);

  const generateTermReport = async (termId: string, grade: string, subject: string) => {
    if (!termId || grade === "all" || subject === "all") {
      showError("Please select a specific Term, Grade, and Subject.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Direct Supabase call: omit term_id to avoid 400 error
      const { data: classesData, error: classErr } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .eq('grade', grade)
        .eq('subject', subject);
        
      if (classErr) throw classErr;

      const allClasses = (classesData || []).filter(c => !c.archived);

      if (!allClasses || allClasses.length === 0) {
        showError("No active classes found for this selection.");
        setLoading(false);
        return;
      }

      const classIds = allClasses.map(c => c.id);
      
      const { data: allLearners } = await supabase
        .from('learners')
        .select('*')
        .in('class_id', classIds);

      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('*')
        .eq('term_id', termId)
        .in('class_id', Array.isArray(classIds) ? classIds : [classIds]);

      const uniqueTitles = Array.from(new Set<string>((assessmentsData || []).map(a => a.title as string))).sort();
      setAllAssessmentTitles(uniqueTitles);

      const assessmentIds = (assessmentsData || []).map(a => a.id);
      const { data: marksData } = await supabase
        .from('assessment_marks')
        .select('*')
        .in('assessment_id', assessmentIds);

      const results: TermReportResult[] = [];

      allClasses.forEach((cls: any) => {
        const classAssessments = (assessmentsData || []).filter((a: any) => a.class_id === cls.id);
        const classLearners = (allLearners || []).filter((l: any) => l.class_id === cls.id);
        const displayClassName = cls.class_name || cls.className || "Class";
        
        classLearners.forEach((learner: any) => {
          if (!learner.id) return;

          const learnerAssessments: { [title: string]: string } = {};

          uniqueTitles.forEach((title: string) => {
              const ass = classAssessments.find((a: any) => a.title === title);
              if (ass) {
                  const markRecord = (marksData || []).find((m: any) => m.assessment_id === ass.id && m.learner_id === learner.id);
                  if (markRecord && markRecord.score !== null) {
                    const score = Number(markRecord.score);
                    learnerAssessments[title] = `${score}/${ass.max_mark}`;
                  } else {
                    learnerAssessments[title] = "-";
                  }
              } else {
                  learnerAssessments[title] = "N/A";
              }
          });

          const avg = calculateWeightedAverage(classAssessments, marksData || [], learner.id);

          results.push({
            learnerName: learner.name,
            className: displayClassName,
            assessments: learnerAssessments,
            termAverage: avg
          });
        });
      });

      results.sort((a, b) => a.learnerName.localeCompare(b.learnerName));
      setReportData(results);
      showSuccess(`Generated report for ${results.length} learners.`);

    } catch (err: any) {
      console.error("[Diagnostic: Reports] Failure:", err);
      showError("Failed to generate report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, reportData, generateTermReport, setReportData, allAssessmentTitles };
};