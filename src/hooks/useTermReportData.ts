import { useState } from 'react';
import { db } from '@/db';
import { Assessment, AssessmentMark, Learner, ClassInfo } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { calculateWeightedAverage } from '@/utils/calculations';

interface TermReportResult {
  learnerName: string;
  className: string;
  assessments: { [title: string]: string }; // "Algebra Test": "85%"
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
      // Diagnostic Fix: Find classes using term_id index and filter by grade/subject
      const allClasses = await db.classes
        .where('term_id')
        .equals(termId)
        .filter((c: any) => c.grade === grade && c.subject === subject && !c.archived)
        .toArray();

      if (!allClasses || allClasses.length === 0) {
        showError("No active classes found for this selection in the chosen term.");
        setLoading(false);
        return;
      }

      const classIds = allClasses.map((c: any) => c.id);
      const allLearners = await db.learners
        .where('class_id')
        .anyOf(classIds)
        .toArray();

      const assessmentsData = await db.assessments
        .where('term_id')
        .equals(termId)
        .filter((a: any) => classIds.includes(a.class_id))
        .toArray();

      const uniqueTitles = Array.from(new Set<string>(assessmentsData.map((a: any) => a.title as string))).sort();
      setAllAssessmentTitles(uniqueTitles);

      const assessmentIds = assessmentsData.map((a: any) => a.id);
      const marksData = await db.assessment_marks
        .where('assessment_id')
        .anyOf(assessmentIds)
        .toArray();

      const results: TermReportResult[] = [];

      allClasses.forEach((cls: any) => {
        const classAssessments = assessmentsData.filter((a: any) => a.class_id === cls.id);
        const classLearners = allLearners.filter((l: any) => l.class_id === cls.id);
        const displayClassName = cls.className || cls.class_name;
        
        classLearners.forEach((learner: any) => {
          if (!learner.id) return;

          const learnerAssessments: { [title: string]: string } = {};

          uniqueTitles.forEach((title: string) => {
              const ass = classAssessments.find((a: any) => a.title === title);
              if (ass) {
                  const markRecord = marksData.find((m: any) => m.assessment_id === ass.id && m.learner_id === learner.id);
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

          const avg = calculateWeightedAverage(classAssessments, marksData, learner.id);

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