"use client";

import { useMemo, useCallback } from 'react';
import { db, AssessmentDiagnostic } from '@/db';
import { Assessment, Learner, AssessmentMark, DiagnosticRow } from '@/lib/types';
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
    const overallAvg = (qStats.reduce((a, b) => a + b.avg, 0) / qStats.length).toFixed(1);

    // --- GENERATE STRUCTURED ROWS ---
    const diagnosticRows: DiagnosticRow[] = [];

    // General Summary Row
    diagnosticRows.push({
        id: 'summary',
        finding: `The class achieved an overall question-average of ${overallAvg}%. ${weakQuestions.length > 0 ? `${weakQuestions.length} questions fell below the 50% threshold.` : "Consistent performance shown across all items."}`,
        intervention: weakQuestions.length > 0 ? "Implement targeted remediation sessions for identified weak concepts." : "Continue with current instructional sequence; provide extension tasks for high performers."
    });

    // Per-Weak Question Rows
    weakQuestions.forEach(q => {
        diagnosticRows.push({
            id: `q-${q.id}`,
            finding: `Question ${q.number} (${q.skill || 'Unspecified Skill'}): Critical failure with only ${q.passRate}% pass rate and ${q.avg}% average score.`,
            intervention: `Re-teach core concepts of ${q.skill || 'this section'}. Provide scaffolded practice examples before the next cycle.`
        });
    });

    // Handle Backward Compatibility: Convert old narrative to rows if they exist
    let convertedRows: DiagnosticRow[] = diagnosticRows;
    if (savedDiagnostic?.findings && !Array.isArray(savedDiagnostic.findings)) {
        // This is an old format record (string)
        // We'll keep the AI generated rows but could optionally try to parse the old string.
        // For simplicity and data safety, we'll suggest the user resets to draft.
    }

    return { 
        qStats, 
        diagnosticRows,
        rawMarks: marks,
        savedDiagnostic: savedDiagnostic || null,
        overallAvg
    };
  }, [assessment, marks, savedDiagnostic]);

  const saveDiagnostic = useCallback(async (rows: DiagnosticRow[]) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const payload: any = {
              id: savedDiagnostic?.id || crypto.randomUUID(),
              assessment_id: assessment.id,
              user_id: user.id,
              findings: JSON.stringify(rows), // Store as JSON string for flexibility
              interventions: "", // Legacy field, kept for schema safety
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