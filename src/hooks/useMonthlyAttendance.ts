import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { AttendanceStatus } from '@/lib/types';
import { queueAction } from '@/services/sync';
import { supabase } from '@/integrations/supabase/client';
import { useAcademic } from '@/context/AcademicContext';

export const useMonthlyAttendance = (classId: string, monthDate: Date) => {
  const { activeTerm } = useAcademic();
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const records = useLiveQuery(
    () => db.attendance
        .where('class_id').equals(classId)
        .filter(r => r.date! >= startStr && r.date! <= endStr && r.term_id === activeTerm?.id)
        .toArray(),
    [classId, startStr, endStr, activeTerm?.id]
  );

  const days = eachDayOfInterval({ start, end });

  const getStatus = (learnerId: string, date: Date) => {
    if (!records) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return records.find(r => r.learner_id === learnerId && r.date === dateStr)?.status;
  };

  const updateStatus = async (learnerId: string, date: Date, currentStatus: AttendanceStatus | null | undefined) => {
    if (!activeTerm) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Retrieve existing record to reuse stable ID
    const existingRecord = records?.find(r => r.learner_id === learnerId && r.date === dateStr);

    // Cycle: null -> present -> absent -> late -> excused -> null
    let nextStatus: AttendanceStatus | null = 'present';
    if (currentStatus === 'present') nextStatus = 'absent';
    else if (currentStatus === 'absent') nextStatus = 'late';
    else if (currentStatus === 'late') nextStatus = 'excused';
    else if (currentStatus === 'excused') nextStatus = null;

    if (nextStatus === null) {
        // Delete record - using stable ID to ensure sync resolves correctly
        if (existingRecord?.id) {
            await db.attendance.delete(existingRecord.id);
            await queueAction('attendance', 'delete', { id: existingRecord.id });
        } else {
            // Fallback: lookup locally if not present in cached records
            const localRecs = await db.attendance.where({ learner_id: learnerId, date: dateStr }).toArray();
            for (const rec of localRecs) {
                if (rec.id) {
                    await db.attendance.delete(rec.id);
                    await queueAction('attendance', 'delete', { id: rec.id });
                }
            }
        }
    } else {
        const payload = {
            id: existingRecord?.id || crypto.randomUUID(), // Guarantee stable ID
            learner_id: learnerId,
            class_id: classId,
            term_id: activeTerm.id,
            user_id: user.id,
            date: dateStr,
            status: nextStatus
        };
        await db.attendance.put(payload);
        await queueAction('attendance', 'upsert', payload);
    }
  };

  return { records, days, loading: !records, getStatus, updateStatus };
};