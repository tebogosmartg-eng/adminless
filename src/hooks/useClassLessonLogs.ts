import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { LessonLog } from '@/lib/types';
import { useAcademic } from '@/context/AcademicContext';

export const useClassLessonLogs = (classId: string) => {
  const { activeTerm } = useAcademic();

  const logs = useLiveQuery(async () => {
    if (!activeTerm?.id || !classId) return [];

    // 1. Get all timetable slots for this class
    const slots = await db.timetable.where('class_id').equals(classId).toArray();
    const slotIds = slots.map((s: any) => s.id);

    if (slotIds.length === 0) return [];

    // 2. Get all logs linked to these slots
    const allLogs = await db.lesson_logs
        .where('timetable_id')
        .anyOf(slotIds)
        .reverse()
        .sortBy('date');
    
    return allLogs as LessonLog[];
  }, [classId, activeTerm?.id]) || [];

  return { logs, loading: !logs };
};