"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Assessment,
  Learner,
  FullDiagnostic,
  AssessmentMark,
  AssessmentQuestion,
  DiagnosticRow,
} from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { generateAIDiagnostic } from "@/services/gemini";
import { buildQuestionDiagnosis } from "@/utils/diagnosticEngine";
import { showError } from "@/utils/toast";
import { PASS_THRESHOLD } from "@/constants/diagnostics";

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

const WEAK_THRESHOLD = PASS_THRESHOLD;

const mean = (vals: number[]) =>
  vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

const round2 = (n: number) => Math.round(n * 100) / 100;

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const resolveQuestionMarkValue = (
  questionMarks: AssessmentMark["question_marks"] | null | undefined,
  q: AssessmentQuestion,
  _index: number
): number | null => {
  if (!questionMarks || typeof questionMarks !== "object") return null;

  const markObject = questionMarks as Record<string, unknown>;
  const strictValue = toNumberOrNull(markObject[q.id]);
  if (strictValue != null) return strictValue;

  const legacyNumberValue = toNumberOrNull(markObject[String(q.question_number)]);
  if (legacyNumberValue != null) {
    return legacyNumberValue;
  }

  const orderedKeys = Object.keys(markObject);
  console.warn("[diagnostic] unresolved question mark key", {
    questionId: q.id,
    questionNumber: q.question_number,
    availableKeys: orderedKeys,
  });

  return null;
};

function parseMaybeJson<T = unknown>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}

export interface QuestionAnalysisStats {
  qStats: QuestionStat[];
  rawMarks: AssessmentMark[];
  initialRows: DiagnosticRow[];
  savedDiagnostic?: {
    findings: string;
    interventions: string;
  };
}

function computeQuestionStats(
  assessment: Assessment,
  marks: AssessmentMark[],
  questions: AssessmentQuestion[],
  classSubject: string
): { qStats: QuestionStat[]; initialRows: DiagnosticRow[] } {
  if (!questions.length) {
    const pcts = marks
      .filter((m) => m.score != null && !Number.isNaN(Number(m.score)))
      .map((m) => (Number(m.score) / assessment.max_mark) * 100);

    const avg = pcts.length ? mean(pcts) : 0;
    const stat: QuestionStat = {
      id: "whole-assessment",
      number: "—",
      skill: "Overall assessment",
      max: assessment.max_mark,
      avg: round2(avg),
      high: pcts.length ? round2(Math.max(...pcts)) : 0,
      low: pcts.length ? round2(Math.min(...pcts)) : 0,
      passRate: pcts.length
        ? round2((pcts.filter((p) => p >= PASS_THRESHOLD).length / pcts.length) * 100)
        : 0,
      isWeak: avg < WEAK_THRESHOLD,
      totalAttempts: pcts.length,
    };

    const row = buildQuestionDiagnosis(stat, undefined, classSubject);
    row.question = assessment.title || "Overall";
    return { qStats: [stat], initialRows: [row] };
  }

  const qStats: QuestionStat[] = questions.map((q, index) => {
    const max = q.max_mark || 1;
    const pcts: number[] = [];
    let resolvedCount = 0;
    for (const m of marks) {
      const raw = resolveQuestionMarkValue(m.question_marks, q, index);
      if (raw != null && !Number.isNaN(Number(raw))) {
        pcts.push((Number(raw) / max) * 100);
        resolvedCount += 1;
      }
    }
    const ratio = marks.length > 0 ? resolvedCount / marks.length : 0;
    if (marks.length > 0 && ratio < 0.8) {
      console.warn("[diagnostic] low confidence", ratio);
    }
    console.log("[diagnostic] question key hits:", {
      questionId: q.id,
      questionNumber: q.question_number,
      attemptsResolved: resolvedCount,
      totalMarkRows: marks.length,
    });
    const avg = pcts.length ? mean(pcts) : 0;
    return {
      id: q.id,
      number: q.question_number,
      skill: q.skill_description || "",
      max,
      avg: round2(avg),
      high: pcts.length ? round2(Math.max(...pcts)) : 0,
      low: pcts.length ? round2(Math.min(...pcts)) : 0,
      passRate: pcts.length
        ? round2((pcts.filter((p) => p >= PASS_THRESHOLD).length / pcts.length) * 100)
        : 0,
      isWeak: avg < WEAK_THRESHOLD,
      totalAttempts: pcts.length,
    };
  });

  const totalAttemptsResolved = qStats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
  if (marks.length > 0 && totalAttemptsResolved === 0) {
    throw new Error("No question-level marks could be resolved for this assessment.");
  }

  const outOfRange = qStats.some((stat) => stat.avg < 0 || stat.avg > 100);
  if (outOfRange) {
    console.error("[diagnostic] invalid question averages", qStats.map((stat) => ({ id: stat.id, avg: stat.avg })));
  }
  const avgSet = new Set(qStats.map((stat) => stat.avg));
  if (qStats.length > 1 && avgSet.size === 1) {
    console.warn("[diagnostic] identical averages across questions");
  }

  const initialRows = qStats.map((st) => {
    const qDef = questions.find((qq) => qq.id === st.id);
    return buildQuestionDiagnosis(st, qDef, classSubject);
  });

  return { qStats, initialRows };
}

export const useQuestionAnalysis = (
  assessment: Assessment,
  learners: Learner[],
  classSubject: string = "General"
) => {
  const [stats, setStats] = useState<QuestionAnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStats(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          if (!cancelled) setStats(null);
          return;
        }

        let questions: AssessmentQuestion[] = assessment.questions || [];
        if (!questions.length) {
          const { data: qRows, error: qErr } = await supabase
            .from("assessment_questions")
            .select("*")
            .eq("assessment_id", assessment.id);
          if (qErr) throw qErr;
          questions = (qRows || []) as AssessmentQuestion[];
        }

        const { data: markRows, error: mErr } = await supabase
          .from("assessment_marks")
          .select("*")
          .eq("assessment_id", assessment.id)
          .eq("user_id", userId);

        if (mErr) throw mErr;
        const rawMarks = (markRows || []) as AssessmentMark[];
        console.log("[diagnostic] raw marks:", rawMarks);
        console.log(
          "[diagnostic] question_marks structure sample:",
          rawMarks.slice(0, 5).map((m) => ({
            learnerId: m.learner_id,
            type: typeof m.question_marks,
            keys:
              m.question_marks && typeof m.question_marks === "object"
                ? Object.keys(m.question_marks as Record<string, unknown>)
                : [],
          }))
        );
        console.log(
          "[diagnostic] question ids:",
          questions.map((q) => q.id)
        );

        const { data: diagRow } = await supabase
          .from("diagnostics")
          .select("findings, interventions")
          .eq("assessment_id", assessment.id)
          .eq("user_id", userId)
          .maybeSingle();

        const { qStats, initialRows } = computeQuestionStats(
          assessment,
          rawMarks,
          questions,
          classSubject
        );

        let savedDiagnostic: QuestionAnalysisStats["savedDiagnostic"];
        if (diagRow) {
          const findingsVal = parseMaybeJson<unknown>(diagRow.findings);
          const themesVal = parseMaybeJson<{
            themes?: string[];
            interventions?: string[];
          }>(diagRow.interventions);

          savedDiagnostic = {
            findings: Array.isArray(findingsVal)
              ? JSON.stringify(findingsVal)
              : typeof diagRow.findings === "string"
                ? diagRow.findings
                : JSON.stringify(findingsVal ?? []),
            interventions: JSON.stringify(
              themesVal && typeof themesVal === "object"
                ? {
                    themes: themesVal.themes ?? [],
                    interventions: themesVal.interventions ?? [],
                  }
                : { themes: [], interventions: [] }
            ),
          };
        }

        if (!cancelled) {
          setStats({
            qStats,
            rawMarks,
            initialRows,
            savedDiagnostic,
          });
        }
      } catch (e) {
        console.error("useQuestionAnalysis load error:", e);
        showError("No diagnostic insights available");
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [assessment, classSubject]);

  const generateAIAnalysis = useCallback(
    async (subject: string, grade: string): Promise<FullDiagnostic | null> => {
      if (!stats) {
        console.error("[diagnostic] AI generation requested before diagnostic stats loaded.");
        return null;
      }
      try {
        const payloadStats = {
          qStats: stats.qStats,
          initialRowCount: stats.initialRows.length,
          rawMarkCount: stats.rawMarks.length,
        };
        return await generateAIDiagnostic(assessment, payloadStats, subject, grade);
      } catch (e: unknown) {
        console.error("[diagnostic] generateAIDiagnostic failed", e);
        return null;
      }
    },
    [assessment, stats]
  );

  const saveDiagnostic = useCallback(
    async (fullDiag: FullDiagnostic) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          showError("You must be signed in to save.");
          return;
        }

        const payload = {
          user_id: userId,
          assessment_id: assessment.id,
          findings: fullDiag.rows as unknown as Record<string, unknown>[],
          interventions: {
            themes: fullDiag.overall_class_themes,
            interventions: fullDiag.overall_interventions,
          },
          updated_at: new Date().toISOString(),
        };

        const { data: existing, error: findErr } = await supabase
          .from("diagnostics")
          .select("id")
          .eq("assessment_id", assessment.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (findErr) throw findErr;

        if (existing?.id) {
          const { error: upErr } = await supabase
            .from("diagnostics")
            .update({
              findings: payload.findings,
              interventions: payload.interventions,
              updated_at: payload.updated_at,
            })
            .eq("id", existing.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase
            .from("diagnostics")
            .insert(payload);
          if (insErr) throw insErr;
        }
      } catch (e) {
        console.error(e);
        showError("Failed to save diagnostic.");
      }
    },
    [assessment.id]
  );

  return {
    stats,
    loading,
    saveDiagnostic,
    generateAIAnalysis,
  };
};
