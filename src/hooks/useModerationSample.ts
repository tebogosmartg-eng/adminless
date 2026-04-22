"use client";

import { useState, useCallback, useEffect } from "react";
import { ModerationSample, Learner, AssessmentMark, Assessment } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";

export const useModerationSample = (
  yearId: string,
  termId: string,
  classId: string
) => {
  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState<ModerationSample | null>(null);

  // 🔥 FETCH SAMPLE (replaces useLiveQuery)
  useEffect(() => {
    let isMounted = true;

    const fetchSample = async () => {
      if (!yearId || !termId || !classId) return;

      const { data, error } = await supabase
        .from("moderation_samples")
        .select("*")
        .eq("academic_year_id", yearId)
        .eq("term_id", termId)
        .eq("class_id", classId)
        .maybeSingle();

      if (error) {
        console.error("Fetch sample error:", error);
        return;
      }

      if (isMounted) {
        setSample(data || null);
      }
    };

    fetchSample();

    return () => {
      isMounted = false;
    };
  }, [yearId, termId, classId]);

  // 🔥 GENERATE SAMPLE (unchanged)
  const generateSample = useCallback(async (
    basis: "term_overall" | "assessment",
    assessmentId: string | null,
    rules: { top: number; mid: number; bottom: number; random: number },
    learners: Learner[],
    allAssessments: Assessment[],
    allMarks: AssessmentMark[]
  ) => {
    if (learners.length === 0) return [];

    setLoading(true);
    try {
      const learnerScores = learners.map(l => {
        let score = 0;
        if (basis === "assessment" && assessmentId) {
          const m = allMarks.find(m => m.assessment_id === assessmentId && m.learner_id === l.id);
          const ass = allAssessments.find(a => a.id === assessmentId);
          if (m && m.score !== null && ass) {
            score = (m.score / ass.max_mark) * 100;
          }
        } else {
          score = parseFloat(l.mark) || 0;
        }
        return { id: l.id!, name: l.name, score };
      });

      const sorted = [...learnerScores].sort((a, b) => b.score - a.score);

      const selection = new Set<string>();

      sorted.slice(0, rules.top).forEach(l => selection.add(l.id));

      const remainingAfterTop = sorted.filter(l => !selection.has(l.id));
      const bottomCount = Math.min(rules.bottom, remainingAfterTop.length);
      if (bottomCount > 0) {
        remainingAfterTop.slice(-bottomCount).forEach(l => selection.add(l.id));
      }

      const remainingAfterEnds = sorted.filter(l => !selection.has(l.id));
      if (remainingAfterEnds.length > 0 && rules.mid > 0) {
        const midIdx = Math.floor(remainingAfterEnds.length / 2);
        const halfMid = Math.floor(rules.mid / 2);
        const start = Math.max(0, midIdx - halfMid);
        remainingAfterEnds.slice(start, start + rules.mid).forEach(l => selection.add(l.id));
      }

      const remainingFinally = sorted.filter(l => !selection.has(l.id));
      if (remainingFinally.length > 0 && rules.random > 0) {
        const shuffled = [...remainingFinally].sort(() => 0.5 - Math.random());
        shuffled.slice(0, rules.random).forEach(l => selection.add(l.id));
      }

      setLoading(false);
      return Array.from(selection);
    } catch (e) {
      setLoading(false);
      showError("Sample generation failed.");
      return [];
    }
  }, []);

  // 🔥 SAVE SAMPLE (replaces Dexie + queueAction)
  const saveSample = async (
    learnerIds: string[],
    basis: "term_overall" | "assessment",
    assessmentId: string | null,
    rules: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("User not authenticated.");
        return;
      }

      const payload = {
        id: sample?.id, // upsert behavior
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId,
        class_id: classId,
        assessment_id: assessmentId,
        rules_json: { ...rules, basis },
        learner_ids: learnerIds,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("moderation_samples")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) throw error;

      setSample(data);

      showSuccess("Moderation sample saved.");
    } catch (e) {
      console.error(e);
      showError("Failed to save sample.");
    }
  };

  return { sample, generateSample, saveSample, loading };
};