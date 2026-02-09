import { useState } from 'react';
import { db } from '@/db';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage } from '@/utils/calculations';

interface YearReportResult {
  learnerName: string;
  termMarks: { [termName: string]: number | null };
  finalYearMark: number;
}

export const useYearReportData = () => {
  const [loading, setLoading] = useState(false);
  const [yearData, setYearData] = useState<YearReportResult[] | null>(null);

  const generateYearReport = async (yearId: string, classId: string) => {
    if (!yearId || !classId || classId === 'all') {
      showError("Please select an Academic Year and a specific Class.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get Terms for Year from Local DB
      const terms = await db.terms
        .where('year_id')
        .equals(yearId)
        .toArray();
      
      // 2. Get Class
      const classInfo = await db.classes.get(classId);

      if (!classInfo) {
        showError("Class not found.");
        setLoading(false);
        return;
      }

      // Get Learners for this specific Class
      const learnersData = await db.learners
        .where('class_id')
        .equals(classId)
        .toArray();

      // 3. Get Assessments for ALL terms in this year for this class
      const termIds = terms.map(t => t.id);
      const assessmentsData = await db.assessments
        .where('class_id')
        .equals(classId)
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

      learnersData.forEach((l) => {
          if (l.id) {
              learnerResults[l.id] = {
                  learnerName: l.name,
                  termMarks: {},
                  finalYearMark: 0
              };
          }
      });

      // Calculate Term Marks for each learner
      const learnerIds = Object.keys(learnerResults);

      terms.forEach(term => {
          const termAssessments = assessmentsData.filter(a => a.term_id === term.id);

          learnerIds.forEach(lId => {
              const termAvg = calculateWeightedAverage(termAssessments, marksData, lId);
              
              const hasMarks = termAssessments.some(ass => 
                marksData.some(m => m.assessment_id === ass.id && m.learner_id === lId && m.score !== null)
              );

              learnerResults[lId].termMarks[term.name] = hasMarks ? termAvg : null;
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

  return { loading, yearData, generateYearReport, setYearData };
};