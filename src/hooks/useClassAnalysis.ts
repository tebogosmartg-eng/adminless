"use client";

import { useMemo } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';
import { supabase } from '@/integrations/supabase/client';

export const useClassAnalysis = (classId: string, termId: string | undefined, learnersCount: number = 0) => {
  // 1. Fetch assessments for this specific class and term
  // Including academic_year_id in the check if we can, but class_id + term_id is the primary unique constraint
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

    // Process marks to handle question_marks fallback
    const processedMarks = marks.map((m: any) => {
        let score = m.score;
        // If score is missing but question_marks exist, derive it
        if ((score === null || score === undefined) && m.question_marks && Object.keys(m.question_marks).length > 0) {
            score = Object.values(m.question_marks).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        }
        return { ...m, score: score !== null ? Number(score) : null };
    });

    // Calculate missing marks
    const expectedMarks = assessments.length * learnersCount;
    const recordedMarksCount = processedMarks.filter((m: any) => m.score !== null).length;
    const missingMarksCount = Math.max(0, expectedMarks - recordedMarksCount);

    // If no assessments exist, we still return the basic class metrics
    if (assessments.length === 0) {
        return {
            assessmentPerformance: [],
            learnerPerformance: [],
            classAverage: 0,
            passRate: 0,
            totalAssessments: 0,
            attendanceRate,
            missingMarksCount: 0
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
    // Use a set of learner IDs from the marks to ensure we capture everyone with data
    const learnerIds = [...new Set(processedMarks.map((m: any) => m.learner_id))];
    const learnerPerformance = learnerIds.map((lId: any) => {
      const hasMarks = processedMarks.some((m: any) => m.learner_id === lId && m.score !== null);
      if (!hasMarks) return null;

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
      missingMarksCount
    };
  }, [assessments, marks, attendance, termId, learnersCount]);

  return { analysisData, loading: !analysisData && assessments.length > 0 };
};