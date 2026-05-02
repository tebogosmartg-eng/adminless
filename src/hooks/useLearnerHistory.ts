import { useEffect, useMemo, useRef, useState } from 'react';
import { Learner, ClassInfo } from '@/lib/types';
import { db } from '@/db';

interface LearnerHistoryItem {
  id: string;
  subject: string;
  grade: string;
  className: string;
  mark: number;
  comment?: string;
  date: string;
  title: string;
  type: string;
  weight: number;
}

export const useLearnerHistory = (learner: Learner | null, classes: ClassInfo[]) => {
  const [history, setHistory] = useState<LearnerHistoryItem[]>([]);
  const classesRef = useRef(classes);
  classesRef.current = classes;

  const classIdsKey = useMemo(
    () => classes.map((c) => c.id).filter(Boolean).sort().join(','),
    [classes]
  );

  useEffect(() => {
    let isMounted = true;
    const classesSnapshot = classesRef.current;

    const loadHistory = async () => {
      if (!learner || classesSnapshot.length === 0) {
        if (isMounted) setHistory([]);
        return;
      }

      try {
        const classIds = classesSnapshot.map((c) => c.id).filter(Boolean);
        if (classIds.length === 0) {
          if (isMounted) setHistory([]);
          return;
        }

        const learnerIds = new Set<string>();
        if (learner.id) learnerIds.add(learner.id);

        classesSnapshot.forEach((c) => {
          c.learners.forEach((l) => {
            if (l.id && l.name.toLowerCase() === learner.name.toLowerCase()) {
              learnerIds.add(l.id);
            }
          });
        });

        const ids = Array.from(learnerIds);
        if (ids.length === 0) {
          if (isMounted) setHistory([]);
          return;
        }

        const [assessments, marks] = await Promise.all([
          db.assessments.where('class_id').anyOf(classIds).toArray(),
          db.assessment_marks.where('learner_id').anyOf(ids).toArray()
        ]);

        if (!assessments?.length || !marks?.length) {
          if (isMounted) setHistory([]);
          return;
        }

        const classMap = new Map(classesSnapshot.map((c) => [c.id, c]));
        const marksByAssessment = new Map(
          marks
            .filter((m: any) => m?.score !== null && m?.score !== undefined)
            .map((m: any) => [`${m.assessment_id}::${m.learner_id}`, m])
        );

        const parsedHistory = assessments
          .filter((assessment: any) => classMap.has(assessment.class_id))
          .flatMap((assessment: any) => {
            for (const learnerId of ids) {
              const markRecord = marksByAssessment.get(`${assessment.id}::${learnerId}`);
              if (!markRecord) continue;

              const rawScore = Number(markRecord.score);
              const maxMark = Number(assessment.max_mark);
              if (Number.isNaN(rawScore) || Number.isNaN(maxMark) || maxMark <= 0) continue;

              const percentage = parseFloat(((rawScore / maxMark) * 100).toFixed(1));
              const cls = classMap.get(assessment.class_id);
              if (!cls) continue;

              return [{
                id: assessment.id,
                subject: cls.subject,
                grade: cls.grade,
                className: cls.className,
                mark: percentage,
                comment: markRecord.comment,
                date: assessment.date || '',
                title: assessment.title || 'Untitled Assessment',
                type: assessment.type || 'assessment',
                weight: Number(assessment.weight) || 0
              }];
            }
            return [];
          })
          .sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            if (aTime !== bTime) return aTime - bTime;
            return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
          });

        if (isMounted) setHistory(parsedHistory);
      } catch (error) {
        console.error('Failed to load learner assessment history:', error);
        if (isMounted) setHistory([]);
      }
    };

    void loadHistory();
    return () => {
      isMounted = false;
    };
  }, [learner?.id, learner?.name, classIdsKey]);

  const stats = useMemo(() => {
    if (history.length === 0 || !learner) return null;
    const weightedAverage = Number.parseFloat(learner.mark);
    const avg = Number.isFinite(weightedAverage) ? Math.round(weightedAverage) : 0;
    const max = Math.max(...history.map(i => i.mark));
    return { avg, max, count: history.length };
  }, [history, learner?.id, learner?.mark]);

  const subjects = useMemo(() => {
    return Array.from(new Set(history.map(h => h.subject)));
  }, [history]);

  const getSubjectColor = (subject: string) => {
    const idx = subjects.indexOf(subject);
    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2'];
    return colors[idx % colors.length];
  };

  return { history, stats, subjects, getSubjectColor };
};