"use client";

import { useMemo, useEffect, useState } from "react";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/lib/supabaseClient";

export type StepStatus = "not-started" | "in-progress" | "completed";

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
  optional?: boolean;
}

export const useSetupStatus = () => {
  const { activeYear, activeTerm, loading: academicLoading } = useAcademic();
  const { classes = [], loading: classesLoading } = useClasses();
  const { teacherName } = useSettings();

  const [stats, setStats] = useState({
    learners: 0,
    assessments: 0,
    marks: 0,
    totalExpectedMarks: 0,
  });

  const [weightingReport, setWeightingReport] = useState({
    isValid: false,
    classCount: 0,
    validWeightCount: 0,
  });

  // 🔥 FETCH STATS
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      if (!activeYear || !activeTerm) {
        setStats({ learners: 0, assessments: 0, marks: 0, totalExpectedMarks: 0 });
        return;
      }

      try {
        // Classes in term
        const { data: termClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("term_id", activeTerm.id);

        const classIds = termClasses?.map(c => c.id) || [];

        if (classIds.length === 0) {
          if (isMounted) setStats({ learners: 0, assessments: 0, marks: 0, totalExpectedMarks: 0 });
          return;
        }

        const { count: learnersCount } = await supabase
          .from("learners")
          .select("*", { count: "exact", head: true })
          .in("class_id", classIds);

        const { data: assessments } = await supabase
          .from("assessments")
          .select("id")
          .eq("term_id", activeTerm.id);

        const assessmentIds = assessments?.map(a => a.id) || [];

        let marksCount = 0;
        if (assessmentIds.length > 0) {
          const { count } = await supabase
            .from("assessment_marks")
            .select("*", { count: "exact", head: true })
            .in("assessment_id", assessmentIds)
            .not("score", "is", null);

          marksCount = count || 0;
        }

        if (isMounted) {
          setStats({
            learners: learnersCount || 0,
            assessments: assessments?.length || 0,
            marks: marksCount,
            totalExpectedMarks: (assessments?.length || 0) * (learnersCount || 0),
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [activeYear?.id, activeTerm?.id]);

  // 🔥 FETCH WEIGHTING
  useEffect(() => {
    let isMounted = true;

    const fetchWeighting = async () => {
      if (!activeTerm) {
        setWeightingReport({ isValid: false, classCount: 0, validWeightCount: 0 });
        return;
      }

      try {
        const { data: termAss } = await supabase
          .from("assessments")
          .select("class_id, weight")
          .eq("term_id", activeTerm.id);

          const activeClassesInTerm = (classes || []).filter(
          c => !c.archived && c.term_id === activeTerm.id
        );

        const classGroups: Record<string, number> = {};
        termAss?.forEach(a => {
          classGroups[a.class_id] =
            (classGroups[a.class_id] || 0) + Number(a.weight);
        });

        const validWeightCount = Object.values(classGroups).filter(w => w === 100).length;

        if (isMounted) {
          setWeightingReport({
            isValid:
              activeClassesInTerm.length > 0 &&
              validWeightCount === activeClassesInTerm.length,
            classCount: activeClassesInTerm.length,
            validWeightCount,
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchWeighting();

    return () => {
      isMounted = false;
    };
  }, [activeTerm?.id, classes]);

  // 🔥 LOGIC (unchanged)
  const status = useMemo(() => {
    if (academicLoading || classesLoading) {
      return {
        coreSteps: [] as SetupStep[],
        progress: 0,
        isLoading: true,
        isReadyForFinalization: false,
        hasMarksCaptured: false,
        missingRequired: [] as SetupStep[],
      };
    }

    const isDataReady =
      stats !== undefined &&
      weightingReport !== undefined;
    const steps: SetupStep[] = [];
    let progress = 0;
    let marksCaptured = false;
    let step8Done = false;

    if (isDataReady) {
      const step1Done = !!teacherName && teacherName.trim() !== "";
      steps.push({
        id: 1,
        title: "Personal Details",
        description: "Set up your professional profile.",
        status: step1Done ? "completed" : "in-progress",
        isLocked: false,
      });

      const step2Done = !!activeYear && !!activeTerm;
      steps.push({
        id: 2,
        title: "Academic Year / Term",
        description: "Organize your data cycle.",
        status: step2Done ? "completed" : step1Done ? "in-progress" : "not-started",
        isLocked: !step1Done,
      });

      const step3Done = (classes || []).filter(c => c.term_id === activeTerm?.id).length > 0;
      steps.push({
        id: 3,
        title: "Create Class",
        description: "Create your class structure.",
        status: step3Done ? "completed" : step2Done ? "in-progress" : "not-started",
        isLocked: !step2Done,
      });

      const step4Done = (stats?.learners || 0) > 0;
      const step5Done = (stats?.assessments || 0) > 0;
      steps.push({
        id: 4,
        title: "Add Learners",
        description: "Register learners in your active class.",
        status: step4Done ? "completed" : step3Done ? "in-progress" : "not-started",
        isLocked: !step3Done,
      });
      steps.push({
        id: 5,
        title: "Create Assessments",
        description: "Record formal tasks for this term.",
        status: step5Done ? "completed" : step4Done ? "in-progress" : "not-started",
        isLocked: !step4Done,
      });

      marksCaptured = (stats?.marks || 0) > 0;
      const allMarksDone =
        (stats?.totalExpectedMarks || 0) > 0 &&
        (stats?.marks || 0) >= (stats?.totalExpectedMarks || 0);
      steps.push({
        id: 6,
        title: "Capture Marks",
        description: "Capture learner marks for assessments.",
        status: marksCaptured ? "completed" : step5Done ? "in-progress" : "not-started",
        isLocked: !step5Done,
      });

      const step7Done = weightingReport.isValid && allMarksDone;
      steps.push({
        id: 7,
        title: "Validate Weightings",
        description: "Ensure class weightings and mark coverage are valid.",
        status: step7Done ? "completed" : marksCaptured ? "in-progress" : "not-started",
        isLocked: !marksCaptured,
      });
      step8Done = !!activeTerm?.is_finalised;
      steps.push({
        id: 8,
        title: "Finalize Term",
        description: "Lock the term once all checks are complete.",
        status: step8Done ? "completed" : step7Done ? "in-progress" : "not-started",
        isLocked: !step7Done,
      });

      const completedCount = steps.filter(s => s.status === "completed").length;
      progress = steps.length > 0
        ? Math.round((completedCount / steps.length) * 100)
        : 0;
    }

    return {
      coreSteps: steps,
      progress,
      isLoading: !isDataReady,
      isReadyForFinalization: step8Done,
      hasMarksCaptured: marksCaptured,
      missingRequired: steps.filter(s => s.status !== "completed"),
    };
  }, [activeYear, activeTerm, classes, stats, weightingReport, teacherName, academicLoading, classesLoading]);

  return status;
};