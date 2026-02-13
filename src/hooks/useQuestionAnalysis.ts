"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/db';
import { Assessment, Learner, AssessmentMark, QuestionMark } from '@/lib/types';

export interface QuestionStat {
  id: string;
  number: string;
  skill: string;
  max: number;
  avg: number;
  high: number;
  low: number;
  passRate: number;
  isWeak: boolean;
}

export const useQuestionAnalysis = (assessment: Assessment, learners: Learner[]) => {
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState<AssessmentMark[]>([]);

  useEffect(() => {
    const fetchMarks = async () => {
      setLoading(true);
      const data = await db.assessment_marks
        .where('assessment_id')
        .equals(assessment.id)
        .toArray();
      setMarks(data);
      setLoading(false);
    };
    fetchMarks();
  }, [assessment.id]);

  const stats = useMemo(() => {
    if (!assessment.questions || assessment.questions.length === 0 || marks.length === 0) return null;

    const qStats: QuestionStat[] = assessment.questions.map(q => {
      const qMarks = marks
        .map(m => m.question_marks?.find(qm => qm.question_id === q.id)?.score)
        .filter(s => s !== undefined && s !== null) as number[];

      if (qMarks.length === 0) {
        return { id: q.id, number: q.question_number, skill: q.skill_description, max: q.max_mark, avg: 0, high: 0, low: 0, passRate: 0, isWeak: false };
      }

      const sum = qMarks.reduce((a, b) => a + b, 0);
      const avg = (sum / qMarks.length);
      const avgPct = (avg / q.max_mark) * 100;
      const high = Math.max(...qMarks);
      const low = Math.min(...qMarks);
      const passes = qMarks.filter(s => (s / q.max_mark) >= 0.5).length;
      const passRate = (passes / qMarks.length) * 100;

      return {
        id: q.id,
        number: q.question_number,
        skill: q.skill_description,
        max: q.max_mark,
        avg: parseFloat(avgPct.toFixed(1)),
        high,
        low,
        passRate: Math.round(passRate),
        isWeak: avgPct < 50
      };
    });

    const weakQuestions = qStats.filter(s => s.isWeak);
    const weakSkills = Array.from(new Set(weakQuestions.map(s => s.skill))).filter(Boolean);

    const findings = `The overall class performance for "${assessment.title}" shows an average achievement of ${qStats.reduce((a, b) => a + b.avg, 0) / qStats.length}% across all questions. ${weakQuestions.length > 0 ? `Critical gaps were identified in ${weakQuestions.map(q => q.number).join(', ')}, which primarily assessed ${weakSkills.join(' and ')}.` : 'Learners demonstrated a consistent grasp of the skills assessed.'}`;
    
    const interventions = weakQuestions.length > 0 
        ? `1. Remedial sessions focused on ${weakSkills.join(', ')}.\n2. Re-teaching of core concepts linked to Question ${weakQuestions[0].number}.\n3. Individual support for learners scoring below 40% in these specific sections.`
        : "Continue with the current teaching plan, incorporating extension activities for high performers.";

    return { 
        qStats, 
        weakQuestions, 
        weakSkills,
        drafts: { findings, interventions },
        rawMarks: marks 
    };
  }, [assessment, marks]);

  return { stats, loading };
};