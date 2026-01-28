import { useState } from 'react';
import { db } from '@/db';
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
      // 1. Get all classes matching Grade + Subject from Local DB
      const allClasses = await db.classes
        .filter(c => c.grade === grade && c.subject === subject && !c.archived)
        .toArray();

      if (!allClasses || allClasses.length === 0) {
        showError("No classes found for this selection.");
        setLoading(false);
        return;
      }

      const classIds = allClasses.map(c => c.id);

      // Need to attach learners to classes since Dexie doesn't do joins automatically
      const allLearners = await db.learners
        .where('class_id')
        .anyOf(classIds)
        .toArray();

      // 2. Get Assessments for these classes & term
      const assessmentsData = await db.assessments
        .where('term_id')
        .equals(termId)
        .filter(a => classIds.includes(a.class_id))
        .toArray();

      // 3. Get Marks for these assessments
      const assessmentIds = assessmentsData.map(a => a.id);
      const marksData = await db.assessment_marks
        .where('assessment_id')
        .anyOf(assessmentIds)
        .toArray();

      // 4. Calculation Logic
      const results: TermReportResult[] = [];

      allClasses.forEach((cls) => {
        // Group assessments for this specific class
        const classAssessments = assessmentsData.filter(a => a.class_id === cls.id);
        const classLearners = allLearners.filter(l => l.class_id === cls.id);
        
        // Check weight validity (Rule 7)
        const totalWeight = classAssessments.reduce((sum, a) => sum + Number(a.weight), 0);
        if (totalWeight !== 100 && classAssessments.length > 0) {
            console.warn(`Class ${cls.className} weights total ${totalWeight}%, not 100%. Report may be inaccurate.`);
        }

        classLearners.forEach((learner) => {
          let weightedSum = 0;
          const learnerAssessments: { [title: string]: string } = {};

          classAssessments.forEach(ass => {
            const markRecord = marksData.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
            
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
            className: cls.className,
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