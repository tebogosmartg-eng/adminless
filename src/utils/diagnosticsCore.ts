import { ClassInfo, Assessment, AssessmentMark, Learner } from '@/lib/types';
import { calculateWeightedAverage } from '@/utils/calculations';
import { DiagnosticData } from '@/hooks/useDiagnosticReportData';

export const calculateDiagnosticDataCore = (
  classInfo: ClassInfo, 
  atRiskThreshold: number,
  assessments: Assessment[],
  marks: AssessmentMark[]
): DiagnosticData => {
  const learnerResults = classInfo.learners.map(l => {
    if (!l.id) return { name: l.name, avg: 0 };
    const avg = calculateWeightedAverage(assessments, marks, l.id);
    return { name: l.name, avg };
  });

  const validAvgs = learnerResults.map(r => r.avg).filter(a => a > 0);
  
  const classAvg = validAvgs.length > 0 ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length : 0;
  const highest = validAvgs.length > 0 ? Math.max(...validAvgs) : 0;
  const lowest = validAvgs.length > 0 ? Math.min(...validAvgs) : 0;
  const passCount = validAvgs.filter(a => a >= 50).length;
  const passRate = validAvgs.length > 0 ? (passCount / validAvgs.length) * 100 : 0;
  const atRisk = learnerResults.filter(l => l.avg > 0 && l.avg < atRiskThreshold);

  const bands = {
    "0-29": 0, "30-39": 0, "40-49": 0, "50-59": 0, "60-69": 0, "70-79": 0, "80-100": 0
  };
  validAvgs.forEach(v => {
    if (v < 30) bands["0-29"]++;
    else if (v < 40) bands["30-39"]++;
    else if (v < 50) bands["40-49"]++;
    else if (v < 60) bands["50-59"]++;
    else if (v < 70) bands["60-69"]++;
    else if (v < 80) bands["70-79"]++;
    else bands["80-100"]++;
  });

  const assBreakdown = assessments.map(ass => {
    const assMarks = marks.filter(m => m.assessment_id === ass.id && m.score !== null).map(m => (Number(m.score) / ass.max_mark) * 100);
    return {
      id: ass.id,
      title: ass.title,
      type: ass.type,
      weight: ass.weight,
      avg: assMarks.length > 0 ? assMarks.reduce((a, b) => a + b, 0) / assMarks.length : 0,
      high: assMarks.length > 0 ? Math.max(...assMarks) : 0,
      low: assMarks.length > 0 ? Math.min(...assMarks) : 0
    };
  });

  const autoSummary = `The class achieved an average of ${classAvg.toFixed(1)}%. With a pass rate of ${passRate.toFixed(0)}%, ${atRisk.length} learners have been identified as requiring intervention.`;

  return {
    summary: {
      classAverage: classAvg,
      highestMark: highest,
      lowestMark: lowest,
      passRate,
      totalLearners: classInfo.learners.length,
      belowThresholdCount: atRisk.length,
      threshold: atRiskThreshold
    },
    distribution: bands,
    assessments: assBreakdown,
    comparison: {
      previousAvg: null,
      currentAvg: classAvg,
      change: null
    },
    atRisk: atRisk.map(l => ({ name: l.name, mark: l.avg })),
    autoSummary
  };
};