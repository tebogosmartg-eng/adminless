"use client";

import { useMemo, useCallback } from 'react';
import { db, AssessmentDiagnostic } from '@/db';
import { Assessment, Learner, AssessmentMark } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useLiveQuery } from 'dexie-react-hooks';

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
  totalAttempts: number;
}

export const useQuestionAnalysis = (assessment: Assessment, learners: Learner[]) => {
  // Reactive subscription to all marks for this assessment
  const marks = useLiveQuery(
    () => db.assessment_marks.where('assessment_id').equals(assessment.id).toArray(),
    [assessment.id]
  ) || [];

  const savedDiagnostic = useLiveQuery(
    () => db.diagnostics.where('assessment_id').equals(assessment.id).first(),
    [assessment.id]
  );

  const stats = useMemo(() => {
    if (!assessment.questions || assessment.questions.length === 0 || marks.length === 0) return null;

    const qStats: QuestionStat[] = assessment.questions.map(q => {
      const qMarks = marks
        .map(m => m.question_marks?.find(qm => qm.question_id === q.id)?.score)
        .filter(s => s !== undefined && s !== null) as number[];

      if (qMarks.length === 0) {
        return { 
          id: q.id, number: q.question_number, skill: q.skill_description, 
          max: q.max_mark, avg: 0, high: 0, low: 0, passRate: 0, isWeak: false, totalAttempts: 0 
        };
      }

      const sum = qMarks.reduce((a, b) => a + b, 0);
      const avgRaw = (sum / qMarks.length);
      const avgPct = (avgRaw / q.max_mark) * 100;
      const high = Math.max(...qMarks);
      const low = Math.min(...qMarks);
      
      // Calculate Pass Rate based on 50% threshold for the specific question
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
        isWeak: avgPct < 50,
        totalAttempts: qMarks.length
      };
    });

    const weakQuestions = qStats.filter(s => s.isWeak);
    const strongQuestions = qStats.filter(s => s.avg >= 75);
    const weakSkills = Array.from(new Set(weakQuestions.map(s => s.skill))).filter(Boolean);
    
    const overallAvg = (qStats.reduce((a, b) => a + b.avg, 0) / qStats.length).toFixed(1);

    // --- TEMPLATE-BASED AI DRAFT GENERATION ---
    
    let findings = `Diagnostic Summary for "${assessment.title}":\n`;
    findings += `The class achieved an overall question-average of ${overallAvg}%. `;
    
    if (weakQuestions.length > 0) {
        findings += `Significant learning gaps were identified in ${weakQuestions.map(q => `Q${q.number}`).join(', ')}. `;
        if (weakSkills.length > 0) {
            findings += `These questions primarily assessed "${weakSkills.join(', ')}", suggesting a thematic struggle with these concepts. `;
        }
    } else {
        findings += "Learners demonstrated a strong grasp across all sections, with no critical failures identified at the question level. ";
    }

    if (strongQuestions.length > 0) {
        findings += `The class excelled in ${strongQuestions.map(q => `Q${q.number}`).join(', ')}, showing mastery of ${Array.from(new Set(strongQuestions.map(s => s.skill))).filter(Boolean).join(' and ')}.`;
    }

    let interventions = "Proposed Instructional Strategy:\n";
    if (weakQuestions.length > 0) {
        interventions += `1. Targeted Remediation: Conduct focused group sessions on ${weakSkills.slice(0, 2).join(' and ')}.\n`;
        interventions += `2. Peer Learning: Pair top performers from ${strongQuestions[0]?.number ? `Q${strongQuestions[0].number}` : 'successful sections'} with struggling learners.\n`;
        interventions += `3. Re-teaching: Dedicated 15-minute recap of core theory behind Question ${weakQuestions[0].number} before the next assessment cycle.`;
    } else {
        interventions += "1. Extension Tasks: Provide high-performing learners with more complex application problems.\n";
        interventions += "2. Consolidation: Briefly review the few minor errors caught in the next lesson to maintain momentum.";
    }

    return { 
        qStats, 
        weakQuestions, 
        weakSkills,
        drafts: { findings, interventions },
        rawMarks: marks,
        savedDiagnostic: savedDiagnostic || null,
        overallAvg
    };
  }, [assessment, marks, savedDiagnostic]);

  const saveDiagnostic = useCallback(async (findings: string, interventions: string) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const payload: AssessmentDiagnostic = {
              id: savedDiagnostic?.id || crypto.randomUUID(),
              assessment_id: assessment.id,
              user_id: user.id,
              findings,
              interventions,
              updated_at: new Date().toISOString()
          };

          await db.diagnostics.put(payload);
          await queueAction('diagnostics', 'upsert', payload);
          showSuccess("Diagnostic analysis finalized.");
      } catch (e) {
          showError("Failed to save diagnostic.");
      }
  }, [assessment.id, savedDiagnostic]);

  return { stats, loading: marks === undefined, saveDiagnostic };
};