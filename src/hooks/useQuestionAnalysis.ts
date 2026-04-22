"use client";

import { useCallback } from "react";
import {
  Assessment,
  Learner,
  FullDiagnostic,
} from "@/lib/types";

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

export const useQuestionAnalysis = (
  assessment: Assessment,
  learners: Learner[],
  classSubject: string = "General"
) => {
  // Temporary safe placeholders during migration away from Dexie.
  // Keep the same hook API while preventing runtime fetches/heavy work.
  const stats = null;
  const loading = false;

  void assessment;
  void learners;
  void classSubject;

  // 🔥 AI
  const generateAIAnalysis = useCallback(async (
    subject: string,
    grade: string
  ): Promise<FullDiagnostic | null> => {
    void subject;
    void grade;
    return null;
  }, []);

  // 🔥 SAVE (safe no-op during migration)
  const saveDiagnostic = useCallback(async (fullDiag: FullDiagnostic) => {
    try {
      void fullDiag;
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    stats,
    loading,
    saveDiagnostic,
    generateAIAnalysis
  };
};