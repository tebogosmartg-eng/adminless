"use client";

import { supabase } from "@/lib/supabaseClient";
import { useMemo, useState, useEffect } from "react";
import { calculateWeightedAverage } from "@/utils/calculations";
import { useAcademic } from "@/context/AcademicContext";

export const useClassAnalysis = (
  classId: string,
  termId: string | undefined,
  learnersCount: number = 0
) => {
  const { activeYear } = useAcademic();

  const [marks, setMarks] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // 🔥 FETCH DATA FROM SUPABASE
  // ===============================
  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !termId || !activeYear?.id) return;

      setLoading(true);

      try {
        // 1. MARKS
        const { data: marksData, error: marksError } = await supabase
          .from("assessment_marks")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", termId)
          .eq("academic_year_id", activeYear.id);

        if (marksError) {
          console.error("❌ Marks error:", marksError);
        } else {
          console.log("✅ MARKS:", marksData);
          setMarks(marksData || []);
        }

        // 2. ASSESSMENTS
        const { data: assessmentsData, error: assessmentsError } =
          await supabase
            .from("assessments")
            .select("*")
            .eq("class_id", classId)
            .eq("term_id", termId);

        if (assessmentsError) {
          console.error("❌ Assessments error:", assessmentsError);
        } else {
          console.log("✅ ASSESSMENTS:", assessmentsData);
          setAssessments(assessmentsData || []);
        }

        // 3. ATTENDANCE
        const { data: attendanceData, error: attendanceError } =
          await supabase
            .from("attendance")
            .select("*")
            .eq("class_id", classId)
            .eq("term_id", termId);

        if (attendanceError) {
          console.error("❌ Attendance error:", attendanceError);
        } else {
          setAttendance(attendanceData || []);
        }
      } catch (err) {
        console.error("❌ Unexpected error:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [classId, termId, activeYear?.id]);

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
            (learnerPerformance.filter((l) => l.average >= 50).length /
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
    analysisData,
    loading,
  };
};