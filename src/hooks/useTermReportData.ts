import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Assessment, AssessmentMark, Learner, ClassInfo } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';

interface TermReportResult {
  learnerName: string;
  className: string;
  assessments: { [title: string]: string }; // "Algebra Test": "85%"
  termAverage: number;
}

export const useTermReportData = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<TermReportResult[] | null>(null);

  const generateTermReport = async (termId: string, grade: string, subject: string) => {
    if (!termId || grade === "all" || subject === "all") {
      showError("Please select a specific Term, Grade, and Subject.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get all classes matching Grade + Subject
      const { data: classesData, error: classError } = await supabase
        .from('classes')
        .select('id, class_name, learners(*)')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('archived', false);

      if (classError) throw classError;
      if (!classesData || classesData.length === 0) {
        showError("No classes found for this selection.");
        setLoading(false);
        return;
      }

      const classIds = classesData.map(c => c.id);

      // 2. Get Assessments for these classes & term
      const { data: assessmentsData, error: assError } = await supabase
        .from('assessments')
        .select('*')
        .in('class_id', classIds)
        .eq('term_id', termId);

      if (assError) throw assError;

      // 3. Get Marks for these assessments
      const assessmentIds = assessmentsData?.map(a => a.id) || [];
      const { data: marksData, error: marksError } = await supabase
        .from('assessment_marks')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (marksError) throw marksError;

      // 4. Calculation Logic
      const results: TermReportResult[] = [];

      classesData.forEach((cls) => {
        // Group assessments for this specific class
        const classAssessments = assessmentsData?.filter(a => a.class_id === cls.id) || [];
        
        // Check weight validity (Rule 7)
        const totalWeight = classAssessments.reduce((sum, a) => sum + Number(a.weight), 0);
        if (totalWeight !== 100 && classAssessments.length > 0) {
            console.warn(`Class ${cls.class_name} weights total ${totalWeight}%, not 100%. Report may be inaccurate.`);
        }

        cls.learners.forEach((learner: any) => {
          let weightedSum = 0;
          const learnerAssessments: { [title: string]: string } = {};

          classAssessments.forEach(ass => {
            const markRecord = marksData?.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
            
            if (markRecord && markRecord.score !== null) {
              const score = Number(markRecord.score);
              const weighted = (score / Number(ass.max_mark)) * Number(ass.weight);
              weightedSum += weighted;
              learnerAssessments[ass.title] = `${score}/${ass.max_mark}`;
            } else {
              learnerAssessments[ass.title] = "-";
            }
          });

          results.push({
            learnerName: learner.name,
            className: cls.class_name,
            assessments: learnerAssessments,
            termAverage: parseFloat(weightedSum.toFixed(1))
          });
        });
      });

      // Sort by Name
      results.sort((a, b) => a.learnerName.localeCompare(b.learnerName));
      setReportData(results);
      showSuccess(`Generated report for ${results.length} learners.`);

    } catch (err: any) {
      console.error(err);
      showError("Failed to generate report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, reportData, generateTermReport, setReportData };
};