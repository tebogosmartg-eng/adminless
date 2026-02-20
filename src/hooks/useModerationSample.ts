"use client";

import { useState, useCallback, useEffect } from 'react';
import { db } from '@/db';
import { ModerationSample, Learner, AssessmentMark, Assessment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useLiveQuery } from 'dexie-react-hooks';

export const useModerationSample = (yearId: string, termId: string, classId: string) => {
  const [loading, setLoading] = useState(false);
  
  // Fetch existing sample for this context
  const sample = useLiveQuery(
    () => db.moderation_samples
      .where('[academic_year_id+term_id+class_id]')
      .equals([yearId, termId, classId])
      .first(),
    [yearId, termId, classId]
  );

  const generateSample = useCallback(async (
    basis: 'term_overall' | 'assessment',
    assessmentId: string | null,
    rules: { top: number; mid: number; bottom: number; random: number },
    learners: Learner[],
    allAssessments: Assessment[],
    allMarks: AssessmentMark[]
  ) => {
    if (learners.length === 0) return [];

    setLoading(true);
    try {
      // 1. Calculate scores based on basis
      const learnerScores = learners.map(l => {
        let score = 0;
        if (basis === 'assessment' && assessmentId) {
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

      // 2. Sort descending
      const sorted = [...learnerScores].sort((a, b) => b.score - a.score);
      
      const selection = new Set<string>();
      
      // Top N
      sorted.slice(0, rules.top).forEach(l => selection.add(l.id));

      // Bottom N
      const remainingAfterTop = sorted.filter(l => !selection.has(l.id));
      const bottomCount = Math.min(rules.bottom, remainingAfterTop.length);
      if (bottomCount > 0) {
        remainingAfterTop.slice(-bottomCount).forEach(l => selection.add(l.id));
      }

      // Middle N (closest to median of REMAINING)
      const remainingAfterEnds = sorted.filter(l => !selection.has(l.id));
      if (remainingAfterEnds.length > 0 && rules.mid > 0) {
        const midIdx = Math.floor(remainingAfterEnds.length / 2);
        const halfMid = Math.floor(rules.mid / 2);
        const start = Math.max(0, midIdx - halfMid);
        remainingAfterEnds.slice(start, start + rules.mid).forEach(l => selection.add(l.id));
      }

      // Random N
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

  const saveSample = async (
    learnerIds: string[],
    basis: 'term_overall' | 'assessment',
    assessmentId: string | null,
    rules: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: ModerationSample = {
        id: sample?.id || crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId,
        class_id: classId,
        assessment_id: assessmentId,
        rules_json: { ...rules, basis },
        learner_ids: learnerIds,
        created_at: sample?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.moderation_samples.put(payload);
      await queueAction('moderation_samples', 'upsert', payload);
      showSuccess("Moderation sample saved.");
    } catch (e) {
      showError("Failed to save sample.");
    }
  };

  return { sample, generateSample, saveSample, loading };
};