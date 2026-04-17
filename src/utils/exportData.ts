import { ClassInfo, Learner, Assessment, AssessmentMark, GradeSymbol } from '@/lib/types';
import { calculateWeightedAverage } from '@/utils/calculations';
import { getGradeSymbol } from '@/utils/grading';

export interface ExportData {
  metadata: {
    schoolName: string;
    teacherName: string;
    className: string;
    subject: string;
    grade: string;
    termName: string;
    date: string;
  };
  learners: Array<{
    name: string;
    marks: Record<string, string | number>;
    average: string;
    symbol: string;
    comment: string;
  }>;
  assessments: Assessment[];
}

export const prepareExportData = (
  classInfo: ClassInfo,
  assessments: Assessment[],
  marks: AssessmentMark[],
  gradingScheme: GradeSymbol[],
  schoolName: string,
  teacherName: string,
  termName: string
): ExportData => {
  const learners = classInfo.learners.map(l => {
    const learnerMarks: Record<string, string | number> = {};
    assessments.forEach(ass => {
      const mark = marks.find(m => m.assessment_id === ass.id && m.learner_id === l.id);
      learnerMarks[ass.title] = mark?.score ?? "-";
    });

    const avg = l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0;
    const symbol = getGradeSymbol(avg, gradingScheme);

    return {
      name: l.name,
      marks: learnerMarks,
      average: avg.toFixed(1),
      symbol: symbol?.symbol || "-",
      comment: l.comment || ""
    };
  });

  return {
    metadata: {
      schoolName,
      teacherName,
      className: classInfo.className,
      subject: classInfo.subject,
      grade: classInfo.grade,
      termName,
      date: new Date().toLocaleDateString()
    },
    learners,
    assessments
  };
};