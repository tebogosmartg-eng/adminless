"use client";

import { useMemo, useCallback } from 'react';
import { db } from '@/db';
import { Assessment, Learner, AssessmentMark, DiagnosticRow, FullDiagnostic, AssessmentDiagnostic } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { generateAIDiagnostic } from '@/services/gemini';
import { buildQuestionDiagnosis } from '@/utils/diagnosticEngine';

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

export const useQuestionAnalysis = (assessment: Assessment, learners: Learner[], classSubject: string = "General") => {
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
        .map((m: any) => m.question_marks?.find((qm: any) => qm.question_id === q.id)?.score)
        .filter((s: any) => s !== undefined && s !== null) as number[];

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

    const overallAvg = (qStats.reduce((a, b) => a + b.avg, 0) / qStats.length).toFixed(1);

    // Context-aware diagnostic generation
    const initialRows: DiagnosticRow[] = qStats.map(s => {
       const qDef = assessment.questions?.find(q => q.id === s.id);
       return buildQuestionDiagnosis(s, qDef, classSubject);
    });

    return { 
        qStats, 
        initialRows,
        rawMarks: marks,
        savedDiagnostic: savedDiagnostic || null,
        overallAvg
    };
  }, [assessment, marks, savedDiagnostic, classSubject]);

  const generateAIAnalysis = useCallback(async (subject: string, grade: string): Promise<FullDiagnostic | null> => {
    if (!stats) return null;
    try {
        const response = await generateAIDiagnostic(assessment, stats.qStats, subject, grade);
        return {
            ...response,
            rows: response.rows.map((r: any, i: number) => ({ ...r, id: r.id || `ai-${i}-${Date.now()}` }))
        };
    } catch (e) {
        showError("AI Analysis failed. Reverting to manual entry.");
        return null;
    }
  }, [assessment, stats]);

  const saveDiagnostic = useCallback(async (fullDiag: FullDiagnostic) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const payload: AssessmentDiagnostic = {
              id: savedDiagnostic?.id || crypto.randomUUID(),
              assessment_id: assessment.id,
              user_id: user.id,
              findings: JSON.stringify(fullDiag.rows), 
              interventions: JSON.stringify({
                  themes: fullDiag.overall_class_themes,
                  interventions: fullDiag.overall_interventions
              }), 
              updated_at: new Date().toISOString()
          };

          await db.diagnostics.put(payload);
          await queueAction('diagnostics', 'upsert', payload);
          showSuccess("Diagnostic analysis finalized.");
      } catch (e) {
          showError("Failed to save diagnostic.");
      }
  }, [assessment.id, savedDiagnostic]);

  return { stats, loading: marks === undefined, saveDiagnostic, generateAIAnalysis };
};