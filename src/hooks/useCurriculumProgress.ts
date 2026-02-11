"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useAcademic } from '@/context/AcademicContext';

export const useCurriculumProgress = (subject?: string, grade?: string, classId?: string) => {
  const { activeTerm } = useAcademic();

  const data = useLiveQuery(async () => {
    if (!activeTerm || !subject || !grade) return null;

    // 1. Get all planned topics for this term/subject/grade
    const topics = await db.curriculum_topics
      .where('[subject+grade+term_id]')
      .equals([subject, grade, activeTerm.id])
      .sortBy('order');

    if (topics.length === 0) return { topics: [], percent: 0, coveredCount: 0 };

    // 2. Get all lesson logs for classes of this subject/grade
    // If classId is provided, we filter to just that class's logs
    let logs = [];
    if (classId) {
        const slots = await db.timetable.where('class_id').equals(classId).toArray();
        const slotIds = slots.map(s => s.id);
        logs = await db.lesson_logs.where('timetable_id').anyOf(slotIds).toArray();
    } else {
        logs = await db.lesson_logs.toArray(); 
    }

    const coveredTopicIds = new Set(logs.flatMap(l => l.topic_ids || []));
    const coveredCount = topics.filter(t => coveredTopicIds.has(t.id)).length;
    const percent = Math.round((coveredCount / topics.length) * 100);

    return {
      topics: topics.map(t => ({ ...t, isCovered: coveredTopicIds.has(t.id) })),
      percent,
      coveredCount,
      totalCount: topics.length
    };
  }, [activeTerm?.id, subject, grade, classId]);

  return { data, loading: data === undefined };
};