import { useState } from 'react';
import { db } from '@/db';
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
      // 1. Get Terms for Year from Local DB
      const terms = await db.terms
        .where('year_id')
        .equals(yearId)
        .toArray();
      
      // 2. Get Classes
      const classesData = await db.classes
        .filter(c => c.grade === grade && c.subject === subject && !c.archived)
        .toArray();

      if (!classesData || classesData.length === 0) {
        showError("No classes found.");
        setLoading(false);
        return;
      }

      const classIds = classesData.map(c => c.id);

      // Get Learners for Classes
      const learnersData = await db.learners
        .where('class_id')
        .anyOf(classIds)
        .toArray();

      // 3. Get Assessments for ALL terms in this year for these classes
      const termIds = terms.map(t => t.id);
      const assessmentsData = await db.assessments
        .where('class_id')
        .anyOf(classIds)
        .filter(a => termIds.includes(a.term_id))
        .toArray();

      // 4. Get Marks
      const assessmentIds = assessmentsData.map(a => a.id);
      const marksData = await db.assessment_marks
        .where('assessment_id')
        .anyOf(assessmentIds)
        .toArray();

      // 5. Calculation
      const learnerResults: { [id: string]: YearReportResult } = {};

      classesData.forEach(cls => {
        const classLearners = learnersData.filter(l => l.class_id === cls.id);
        classLearners.forEach((l) => {
            if (l.id) {
                learnerResults[l.id] = {
                    learnerName: l.name,
                    termMarks: {},
                    finalYearMark: 0
                };
            }
        });
      });

      // Calculate Term Marks for each learner
      const learnerIds = Object.keys(learnerResults);
      let totalYearWeight = 0;

      terms.forEach(term => {
          totalYearWeight += Number(term.weight);
          const termAssessments = assessmentsData.filter(a => a.term_id === term.id);

          learnerIds.forEach(lId => {
              let weightedTermSum = 0;
              let termWeightTotal = 0;

              termAssessments.forEach(ass => {
                  const m = marksData.find(md => md.assessment_id === ass.id && md.learner_id === lId);
                  if (m && m.score !== null) {
                      const val = Number(m.score);
                      const weighted = (val / Number(ass.max_mark)) * Number(ass.weight);
                      weightedTermSum += weighted;
                      termWeightTotal += Number(ass.weight);
                  }
              });

              // Term Mark Calculation
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

          // Final Mark is normalized to the active weight
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