import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface YearReportResult {
  learnerName: string;
  termMarks: { [termName: string]: number | null };
  finalYearMark: number;
}

export const useYearReportData = () => {
  const [loading, setLoading] = useState(false);
  const [yearData, setYearData] = useState<YearReportResult[] | null>(null);

  const generateYearReport = async (yearId: string, grade: string, subject: string) => {
    if (!yearId || grade === "all" || subject === "all") {
      showError("Please select an Academic Year, Grade, and Subject.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get Terms for Year
      const { data: terms, error: termError } = await supabase
        .from('terms')
        .select('*')
        .eq('year_id', yearId);
      
      if (termError) throw termError;
      
      // 2. Get Classes
      const { data: classesData, error: classError } = await supabase
        .from('classes')
        .select('id, class_name, learners(*)')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('archived', false);

      if (classError) throw classError;
      if (!classesData || classesData.length === 0) {
        showError("No classes found.");
        setLoading(false);
        return;
      }

      const classIds = classesData.map(c => c.id);

      // 3. Get Assessments for ALL terms in this year for these classes
      const { data: assessmentsData, error: assError } = await supabase
        .from('assessments')
        .select('*')
        .in('class_id', classIds)
        .in('term_id', terms.map(t => t.id));

      if (assError) throw assError;

      // 4. Get Marks
      const assessmentIds = assessmentsData?.map(a => a.id) || [];
      const { data: marksData, error: marksError } = await supabase
        .from('assessment_marks')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (marksError) throw marksError;

      // 5. Calculation
      const learnerResults: { [id: string]: YearReportResult } = {};

      classesData.forEach(cls => {
        cls.learners.forEach((l: any) => {
            learnerResults[l.id] = {
                learnerName: l.name,
                termMarks: {},
                finalYearMark: 0
            };
        });
      });

      // Calculate Term Marks for each learner
      const learnerIds = Object.keys(learnerResults);
      let totalYearWeight = 0;

      terms.forEach(term => {
          totalYearWeight += Number(term.weight);
          const termAssessments = assessmentsData?.filter(a => a.term_id === term.id) || [];

          learnerIds.forEach(lId => {
              let weightedTermSum = 0;
              let termWeightTotal = 0;

              termAssessments.forEach(ass => {
                  const m = marksData?.find(md => md.assessment_id === ass.id && md.learner_id === lId);
                  if (m && m.score !== null) {
                      const val = Number(m.score);
                      const weighted = (val / Number(ass.max_mark)) * Number(ass.weight);
                      weightedTermSum += weighted;
                      termWeightTotal += Number(ass.weight);
                  }
              });

              // Term Mark Calculation
              // If assessments don't sum to 100, we normalize based on what was assessed? 
              // Or strictly assume sum. Let's use running total.
              const termMark = termWeightTotal > 0 ? (weightedTermSum / termWeightTotal) * 100 : null;
              
              learnerResults[lId].termMarks[term.name] = termMark !== null ? parseFloat(termMark.toFixed(1)) : null;
          });
      });

      // Calculate Final Year Mark
      learnerIds.forEach(lId => {
          let yearSum = 0;
          let activeWeight = 0;

          terms.forEach(term => {
              const tMark = learnerResults[lId].termMarks[term.name];
              if (tMark !== null) {
                  yearSum += (tMark * Number(term.weight));
                  activeWeight += Number(term.weight);
              }
          });

          // Final Mark is normalized to the active weight (e.g. if Term 4 is missing, calculate based on T1-T3)
          // This allows "Year-to-date" marks
          const final = activeWeight > 0 ? (yearSum / activeWeight) : 0;
          learnerResults[lId].finalYearMark = parseFloat(final.toFixed(1));
      });

      const finalResults = Object.values(learnerResults).sort((a, b) => a.learnerName.localeCompare(b.learnerName));
      setYearData(finalResults);
      showSuccess("Year-end report generated.");

    } catch (e: any) {
      console.error(e);
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, yearData, generateYearReport };
};