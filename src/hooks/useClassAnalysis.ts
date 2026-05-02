"use client";

import { supabase } from "@/lib/supabaseClient";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { calculateWeightedAverage } from "@/utils/calculations";
import { useAcademic } from "@/context/AcademicContext";
import { applySupabaseAssessmentOrder, sortAssessmentsDeterministically } from "@/utils/assessmentOrdering";
import { PASS_THRESHOLD } from "@/constants/diagnostics";

type ClassInsightsPayload = {
  marks: any[];
  assessments: any[];
  attendance: any[];
};

const QUERY_KEY_NONE = "none" as const;

/** Deterministic React Query key; must match prefetch callers. */
export const getClassInsightsQueryKey = (
  classId: string,
  termId: string | undefined,
  activeYearId: string | undefined
) => ["insights", classId, termId ?? QUERY_KEY_NONE, activeYearId ?? QUERY_KEY_NONE] as const;

export const fetchClassInsights = async (
  classId: string,
  termId: string | undefined,
  activeYearId: string | undefined
): Promise<ClassInsightsPayload> => {
  if (!classId || !termId || !activeYearId) {
    return { marks: [], assessments: [], attendance: [] };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData?.session?.user;
  if (!user) {
    return { marks: [], assessments: [], attendance: [] };
  }

  // Run all three calls together to reduce wait time.
  const [marksResult, assessmentsResult, attendanceResult] = await Promise.all([
    supabase
      .from("assessment_marks")
      .select("*")
      .eq("class_id", classId)
      .eq("term_id", termId)
      .eq("academic_year_id", activeYearId)
      .eq("user_id", user.id),
    applySupabaseAssessmentOrder(
      supabase
        .from("assessments")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", termId)
        .eq("user_id", user.id)
    ),
    supabase
      .from("attendance")
      .select("*")
      .eq("class_id", classId)
      .eq("term_id", termId)
      .eq("user_id", user.id),
  ]);

  if (marksResult.error) {
    throw marksResult.error;
  }
  if (assessmentsResult.error) {
    throw assessmentsResult.error;
  }
  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  return {
    marks: marksResult.data ?? [],
    assessments: sortAssessmentsDeterministically(assessmentsResult.data ?? []),
    attendance: attendanceResult.data ?? [],
  };
};

export const useClassAnalysis = (
  classId: string,
  termId: string | undefined,
  learnersCount: number = 0
) => {
  const { activeYear } = useAcademic();
  const {
    data,
    error: insightsQueryError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: getClassInsightsQueryKey(classId, termId, activeYear?.id),
    queryFn: () => fetchClassInsights(classId, termId, activeYear?.id),
    enabled: !!classId && !!termId && !!activeYear?.id,
    staleTime: 60_000,
  });

  const error: Error | null =
    insightsQueryError == null
      ? null
      : insightsQueryError instanceof Error
        ? insightsQueryError
        : new Error(String(insightsQueryError));

  const marks = data?.marks ?? [];
  const assessments = data?.assessments ?? [];
  const attendance = data?.attendance ?? [];

  // ===============================
  // 🔥 ANALYTICS ENGINE
  // ===============================
  const analysisData = useMemo(() => {
    if (!marks.length) return null;

    // Fix scores (handle question_marks fallback)
    const processedMarks = marks.map((m: any) => {
      let score = m.score;

      if (
        (score === null || score === undefined) &&
        m.question_marks &&
        Object.keys(m.question_marks).length > 0
      ) {
        score = Object.values(m.question_marks).reduce(
          (acc: number, val: any) => acc + (Number(val) || 0),
          0
        );
      }

      return { ...m, score: score !== null ? Number(score) : null };
    });

    const hasMarks = processedMarks.some(
      (m) => m.score !== null && m.score !== undefined
    );

    // ===============================
    // 📊 ATTENDANCE
    // ===============================
    let attendanceRate = 0;
    if (attendance.length > 0) {
      const present = attendance.filter(
        (r: any) => r.status === "present" || r.status === "late"
      ).length;

      attendanceRate = Math.round((present / attendance.length) * 100);
    }

    // ===============================
    // 📊 PER ASSESSMENT
    // ===============================
    const assessmentPerformance = assessments.map((ass: any) => {
      const assMarks = processedMarks.filter(
        (m: any) => m.assessment_id === ass.id && m.score !== null
      );

      if (assMarks.length === 0) {
        return {
          id: ass.id,
          title: ass.title,
          avg: 0,
          weight: ass.weight,
          date: ass.date,
        };
      }

      const totalPct = assMarks.reduce(
        (sum: number, m: any) =>
          sum + (Number(m.score) / ass.max_mark) * 100,
        0
      );

      return {
        id: ass.id,
        title: ass.title,
        avg: Math.round(totalPct / assMarks.length),
        weight: ass.weight,
        date: ass.date,
      };
    });

    // ===============================
    // 📊 PER LEARNER
    // ===============================
    const learnerIds = [
      ...new Set(processedMarks.map((m: any) => m.learner_id)),
    ];

    const learnerPerformance = learnerIds
      .map((lid: any) => {
        const hasMarksForLearner = processedMarks.some(
          (m: any) => m.learner_id === lid && m.score !== null
        );

        if (!hasMarksForLearner) return null;

        const avg = calculateWeightedAverage(
          assessments,
          processedMarks,
          lid
        );

        return {
          learnerId: lid,
          average: avg,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.average - a.average);

    // ===============================
    // 📊 CLASS METRICS
    // ===============================
    const classAverage =
      learnerPerformance.length > 0
        ? Math.round(
            learnerPerformance.reduce((s, l) => s + l.average, 0) /
              learnerPerformance.length
          )
        : 0;

    const passRate =
      learnerPerformance.length > 0
        ? Math.round(
            (learnerPerformance.filter((l) => l.average >= PASS_THRESHOLD).length /
              learnerPerformance.length) *
              100
          )
        : 0;

    const expectedMarks = assessments.length * learnersCount;
    const recordedMarks = processedMarks.filter(
      (m: any) => m.score !== null
    ).length;

    const missingMarksCount = Math.max(
      0,
      expectedMarks - recordedMarks
    );

    return {
      assessmentPerformance,
      learnerPerformance,
      classAverage,
      passRate,
      totalAssessments: assessments.length,
      attendanceRate,
      missingMarksCount,
      hasMarks,
    };
  }, [marks, assessments, attendance, learnersCount]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    analysisData,
    loading: isLoading,
  };
};