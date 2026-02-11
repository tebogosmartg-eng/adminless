"use client";

import { useState, useEffect } from 'react';
import { db } from '@/db';
import { ClassInfo } from '@/lib/types';
import { calculateWeightedAverage } from '@/utils/calculations';

export interface DiagnosticData {
  summary: {
    classAverage: number;
    highestMark: number;
    lowestMark: number;
    passRate: number;
    totalLearners: number;
    belowThresholdCount: number;
    threshold: number;
  };
  distribution: {
    [key: string]: number;
  };
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    weight: number;
    avg: number;
    high: number;
    low: number;
  }>;
  comparison: {
    previousAvg: number | null;
    currentAvg: number;
    change: number | null;
  };
  atRisk: Array<{ name: string; mark: number }>;
  autoSummary: string;
}

export const useDiagnosticReportData = (classInfo: ClassInfo, termId: string, atRiskThreshold: number) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assessments = await db.assessments
          .where('[class_id+term_id]')
          .equals([classInfo.id, termId])
          .toArray();

        const assessmentIds = assessments.map(a => a.id);
        const marks = await db.assessment_marks
          .where('assessment_id')
          .anyOf(assessmentIds)
          .toArray();

        const learnerResults = classInfo.learners.map(l => {
          if (!l.id) return { name: l.name, avg: 0 };
          const avg = calculateWeightedAverage(assessments, marks, l.id);
          return { name: l.name, avg };
        });

        const validAvgs = learnerResults.map(r => r.avg).filter(a => a > 0);
        
        const classAvg = validAvgs.length > 0 ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length : 0;
        const highest = validAvgs.length > 0 ? Math.max(...validAvgs) : 0;
        const lowest = validAvgs.length > 0 ? Math.min(...validAvgs) : 0;
        const passCount = validAvgs.filter(a => a >= 40).length;
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

        let prevAvg: number | null = null;
        const currentTerm = await db.terms.get(termId);
        if (currentTerm) {
          const allTerms = await db.terms.where('year_id').equals(currentTerm.year_id).sortBy('name');
          const currentIdx = allTerms.findIndex(t => t.id === termId);
          if (currentIdx > 0) {
            const prevTerm = allTerms[currentIdx - 1];
            const prevClass = await db.classes
              .where('term_id').equals(prevTerm.id)
              .and(c => (c.className === classInfo.className || (c as any).class_name === classInfo.className) && c.subject === classInfo.subject)
              .first();
            
            if (prevClass) {
              const prevLearners = await db.learners.where('class_id').equals(prevClass.id).toArray();
              const prevAss = await db.assessments.where('term_id').equals(prevTerm.id).and(a => a.class_id === prevClass.id).toArray();
              const prevMarks = await db.assessment_marks.where('assessment_id').anyOf(prevAss.map(a => a.id)).toArray();
              
              const prevValidAvgs = prevLearners.map(l => l.id ? calculateWeightedAverage(prevAss, prevMarks, l.id) : 0).filter(a => a > 0);
              if (prevValidAvgs.length > 0) {
                prevAvg = prevValidAvgs.reduce((a, b) => a + b, 0) / prevValidAvgs.length;
              }
            }
          }
        }

        const trend = prevAvg ? (classAvg > prevAvg ? "an improvement" : "a decline") : "consistent performance";
        const autoSummary = `The class achieved an average of ${classAvg.toFixed(1)}% for this term. Performance shows ${trend} compared to previous benchmarks. With a pass rate of ${passRate.toFixed(0)}%, ${atRisk.length} learners have been identified as requiring urgent intervention. The highest achievement was ${highest.toFixed(0)}%, while the lowest recorded was ${lowest.toFixed(0)}%.`;

        setData({
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
            previousAvg: prevAvg,
            currentAvg: classAvg,
            change: prevAvg ? classAvg - prevAvg : null
          },
          atRisk: atRisk.map(l => ({ name: l.name, mark: l.avg })),
          autoSummary
        });
      } catch (err) {
        console.error("Diagnostic calc error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classInfo, termId, atRiskThreshold]);

  return { data, loading };
};