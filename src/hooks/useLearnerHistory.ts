import { useMemo } from 'react';
import { Learner, ClassInfo } from '@/types';

export const useLearnerHistory = (learner: Learner | null, classes: ClassInfo[]) => {
  const history = useMemo(() => {
    if (!learner) return [];

    const records = classes.flatMap(c => {
      // Fuzzy match or exact match on name
      const match = c.learners.find(l => l.name.toLowerCase() === learner.name.toLowerCase());
      if (match && match.mark && !isNaN(parseFloat(match.mark))) {
        return {
          id: c.id,
          subject: c.subject,
          grade: c.grade,
          className: c.className,
          mark: parseFloat(match.mark),
          comment: match.comment,
          date: c.id // Using ID as proxy for date if it's timestamp-based
        };
      }
      return [];
    });

    // Sort by date/ID
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }, [learner, classes]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const total = history.reduce((sum, item) => sum + item.mark, 0);
    const avg = Math.round(total / history.length);
    const max = Math.max(...history.map(i => i.mark));
    const min = Math.min(...history.map(i => i.mark));
    return { avg, max, min, count: history.length };
  }, [history]);

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