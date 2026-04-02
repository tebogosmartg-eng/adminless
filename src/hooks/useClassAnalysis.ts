"use client";

import { useMemo } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useClassAnalysis = (classId: string, termId: string | undefined, learnersCount: number = 0) => {
  // 1. Fetch assessments for this specific class and term
  const assessments = useLiveQuery(
    () => termId ? db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray() : [],
    [classId, termId]
  ) || [];

  // 2. Fetch marks for these specific assessments
  const marks = useLiveQuery(
    async () => {
      if (assessments.length === 0) return [];
      const ids = assessments.map((a: any) => a.id);
      return db.assessment_marks.where('assessment_id').anyOf(ids).toArray();
    },
    [assessments]
  ) || [];

  // 3. Fetch attendance records for this class and term
  const attendance = useLiveQuery(
    () => termId ? db.attendance.where('class_id').equals(classId).filter((r: any) => r.term_id === termId).toArray() : [],
    [classId, termId]
  ) || [];

  const analysisData = useMemo(() => {
    if (!termId) return null;

    // Calculate attendance rate
    let attendanceRate = 0;
    if (attendance.length > 0) {
        const presentLike = attendance.filter((r: any) => r.status === 'present' || r.status === 'late').length;
        attendanceRate = Math.round((presentLike / attendance.length) * 100);
    }

    // Calculate missing marks
    const expectedMarks = assessments.length * learnersCount;
    const recordedMarks = marks.filter((m: any) => m.score !== null).length;
    const missingMarksCount = Math.max(0, expectedMarks - recordedMarks);

    if (assessments.length === 0) {
        return {
            assessmentPerformance: [],
            learnerPerformance: [],
            classAverage: 0,
            passRate: 0,
            totalAssessments: 0,
            attendanceRate,
            missingMarksCount
        };
    }

    // Calculate per-assessment stats
    const assessmentPerformance = assessments.map((ass: any) => {
      const assMarks = marks.filter((m: any) => m.assessment_id === ass.id && m.score !== null);
      if (assMarks.length === 0) return { title: ass.title, avg: 0, weight: ass.weight, date: ass.date };

      const totalPct = assMarks.reduce((sum: number, m: any) => sum + (Number(m.score) / ass.max_mark) * 100, 0);
      return {
        id: ass.id,
        title: ass.title,
        avg: Math.round(totalPct / assMarks.length),
        weight: ass.weight,
        date: ass.date
      };
    }).sort((a: any, b: any) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());

    // Calculate per-learner analytics
    const learnerIds = [...new Set(marks.map((m: any) => m.learner_id))];
    const learnerPerformance = learnerIds.map((lId: any) => {
      const hasMarks = marks.some((m: any) => m.learner_id === lId && m.score !== null);
      if (!hasMarks) return null;

      const avg = calculateWeightedAverage(assessments, marks, lId as string);
      
      return {
        learnerId: lId,
        average: avg
      };
    }).filter(Boolean).sort((a: any, b: any) => b.average - a.average);

    const classAvg = learnerPerformance.length > 0 
        ? Math.round(learnerPerformance.reduce((s, l) => s + l.average, 0) / learnerPerformance.length) 
        : 0;

    const passRate = learnerPerformance.length > 0
        ? Math.round((learnerPerformance.filter(l => l.average >= 50).length / learnerPerformance.length) * 100)
        : 0;

    return {
      assessmentPerformance,
      learnerPerformance,
      classAverage: classAvg,
      passRate,
      totalAssessments: assessments.length,
      attendanceRate,
      missingMarksCount
    };
  }, [assessments, marks, attendance, termId, learnersCount]);

  return { analysisData, loading: !analysisData && assessments.length > 0 };
};