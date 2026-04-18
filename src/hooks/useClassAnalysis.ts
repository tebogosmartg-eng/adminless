"use client";

import { useMemo } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';
import { useAcademic } from '@/context/AcademicContext';

export const useClassAnalysis = (classId: string, termId: string | undefined, learnersCount: number = 0) => {
  const { activeYear } = useAcademic();

  // 1. Fetch assessments for this specific class and term
  const assessments = useLiveQuery(
    async () => {
        if (!termId || !classId) return [];
        return await db.assessments
            .where('[class_id+term_id]')
            .equals([classId, termId])
            .toArray();
    },
    [classId, termId]
  ) || [];

  // 2. Fetch marks using the full context: user_id (handled by db shim), class_id, term_id, and academic_year_id
  const marks = useLiveQuery(
    async () => {
      if (!termId || !classId || !activeYear?.id) return [];
      
      return await db.assessment_marks
        .where({
            class_id: classId,
            term_id: termId,
            academic_year_id: activeYear.id
        })
        .toArray();
    },
    [classId, termId, activeYear?.id]
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

    // Process marks to handle question_marks fallback
    const processedMarks = marks.map((m: any) => {
        let score = m.score;
        if ((score === null || score === undefined) && m.question_marks && Object.keys(m.question_marks).length > 0) {
            score = Object.values(m.question_marks).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        }
        return { ...m, score: score !== null ? Number(score) : null };
    });

    // Calculate missing marks based on existing assessments
    const expectedMarks = assessments.length * learnersCount;
    const recordedMarksCount = processedMarks.filter((m: any) => m.score !== null).length;
    const missingMarksCount = assessments.length > 0 ? Math.max(0, expectedMarks - recordedMarksCount) : 0;

    const hasMarks = processedMarks.some(m => m.score !== null);

    // If no assessments exist yet but marks do (rare but possible during sync), we still try to calculate basic averages
    if (assessments.length === 0) {
        return {
            assessmentPerformance: [],
            learnerPerformance: [],
            classAverage: 0,
            passRate: 0,
            totalAssessments: 0,
            attendanceRate,
            missingMarksCount: 0,
            hasMarks
        };
    }

    // Calculate per-assessment stats
    const assessmentPerformance = assessments.map((ass: any) => {
      const assMarks = processedMarks.filter((m: any) => m.assessment_id === ass.id && m.score !== null);
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
    const learnerIds = [...new Set(processedMarks.map((m: any) => m.learner_id))];
    const learnerPerformance = learnerIds.map((lId: any) => {
      const hasMarksForLearner = processedMarks.some((m: any) => m.learner_id === lId && m.score !== null);
      if (!hasMarksForLearner) return null;

      const avg = calculateWeightedAverage(assessments, processedMarks, lId as string);
      
      return {
        learnerId: lId,
        average: avg
      };
    }).filter(Boolean).sort((a: any, b: any) => b!.average - a!.average);

    const classAvg = learnerPerformance.length > 0 
        ? Math.round(learnerPerformance.reduce((s, l) => s + l!.average, 0) / learnerPerformance.length) 
        : 0;

    const passRate = learnerPerformance.length > 0
        ? Math.round((learnerPerformance.filter(l => l!.average >= 50).length / learnerPerformance.length) * 100)
        : 0;

    return {
      assessmentPerformance,
      learnerPerformance,
      classAverage: classAvg,
      passRate,
      totalAssessments: assessments.length,
      attendanceRate,
      missingMarksCount,
      hasMarks
    };
  }, [assessments, marks, attendance, termId, learnersCount]);

  return { analysisData, loading: !analysisData && (assessments.length > 0 || marks.length > 0) };
};