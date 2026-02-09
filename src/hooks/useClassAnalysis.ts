"use client";

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useClassAnalysis = (classId: string, termId: string | undefined) => {
  // 1. Fetch assessments for this specific class and term
  const assessments = useLiveQuery(
    () => termId ? db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray() : [],
    [classId, termId]
  ) || [];

  // 2. Fetch marks for these specific assessments
  const marks = useLiveQuery(
    async () => {
      if (assessments.length === 0) return [];
      const ids = assessments.map(a => a.id);
      return db.assessment_marks.where('assessment_id').anyOf(ids).toArray();
    },
    [assessments]
  ) || [];

  const analysisData = useMemo(() => {
    if (!termId || assessments.length === 0) return null;

    // Calculate per-assessment stats
    const assessmentPerformance = assessments.map(ass => {
      const assMarks = marks.filter(m => m.assessment_id === ass.id && m.score !== null);
      if (assMarks.length === 0) return { title: ass.title, avg: 0, weight: ass.weight, date: ass.date };

      const totalPct = assMarks.reduce((sum, m) => sum + (Number(m.score) / ass.max_mark) * 100, 0);
      return {
        id: ass.id,
        title: ass.title,
        avg: Math.round(totalPct / assMarks.length),
        weight: ass.weight,
        date: ass.date
      };
    }).sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());

    // Calculate per-learner term aggregates for this specific class
    const learnerIds = [...new Set(marks.map(m => m.learner_id))];
    const learnerPerformance = learnerIds.map(lId => {
      const avg = calculateWeightedAverage(assessments, marks, lId);
      
      return {
        learnerId: lId,
        average: avg
      };
    }).sort((a, b) => b.average - a.average);

    return {
      assessmentPerformance,
      learnerPerformance,
      classAverage: learnerPerformance.length > 0 
        ? Math.round(learnerPerformance.reduce((s, l) => s + l.average, 0) / learnerPerformance.length) 
        : 0,
      totalAssessments: assessments.length
    };
  }, [assessments, marks, termId]);

  return { analysisData, loading: !analysisData && assessments.length > 0 };
};