"use client";

import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { normalizeTopic } from '@/utils/topic';

/**
 * Extracts a deduplicated list of topic suggestions based on the user's history.
 * Prioritizes matching the current subject and grade if provided.
 */
export const useTopicSuggestions = (subject?: string, grade?: string) => {
  return useLiveQuery(async () => {
    const suggestions = new Set<string>();

    try {
      // 1. Fetch official topics from curriculum planner
      const allTopics = await db.curriculum_topics.toArray();
      allTopics.forEach((t: any) => {
        if ((!subject || t.subject === subject) && (!grade || t.grade === grade)) {
          if (t.title) suggestions.add(normalizeTopic(t.title));
        }
      });

      // 2. Fetch organically created topics from previous assessments
      const classes = await db.classes.toArray();
      const classMap = new Map(classes.map((c: any) => [c.id, c]));

      const allAssessments = await db.assessments.toArray();
      allAssessments.forEach((a: any) => {
        const cls = classMap.get(a.class_id) as any;
        // Only include if it matches the current class context (or if no context is provided)
        if (cls && (!subject || cls.subject === subject) && (!grade || cls.grade === grade)) {
          a.questions?.forEach((q: any) => {
            if (q.topic) suggestions.add(normalizeTopic(q.topic));
          });
        }
      });
    } catch (error) {
      console.error("Error fetching topic suggestions:", error);
    }

    return Array.from(suggestions).sort();
  }, [subject, grade]) || [];
};