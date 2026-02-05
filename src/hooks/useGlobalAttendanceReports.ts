import { useState } from 'react';
import { db } from '@/db';
import { Learner, AttendanceRecord } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

export interface GlobalAttendanceResult {
    learnerName: string;
    className: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
}

export const useGlobalAttendanceReports = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalAttendanceResult[] | null>(null);

  const generateReport = async (termId: string, grade: string, subject: string) => {
    if (!termId || grade === "all") {
        showError("Please select a Term and Grade.");
        return;
    }

    setLoading(true);
    try {
        // 1. Get relevant classes
        const classes = await db.classes
            .filter(c => c.term_id === termId && c.grade === grade && (subject === 'all' || c.subject === subject) && !c.archived)
            .toArray();

        if (classes.length === 0) {
            setData([]);
            setLoading(false);
            return;
        }

        const classIds = classes.map(c => c.id);

        // 2. Get Learners
        const learners = await db.learners
            .where('class_id')
            .anyOf(classIds)
            .toArray();

        // 3. Get Attendance Records for these classes in this term
        const records = await db.attendance
            .where('term_id')
            .equals(termId)
            .filter(r => classIds.includes(r.class_id!))
            .toArray();

        // 4. Aggregate
        const results: GlobalAttendanceResult[] = learners.map(l => {
            const lRecs = records.filter(r => r.learner_id === l.id);
            const present = lRecs.filter(r => r.status === 'present').length;
            const absent = lRecs.filter(r => r.status === 'absent').length;
            const late = lRecs.filter(r => r.status === 'late').length;
            const total = lRecs.length;
            const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
            
            const cls = classes.find(c => c.id === l.class_id);

            return {
                learnerName: l.name,
                className: cls?.className || "Unknown",
                present,
                absent,
                late,
                total,
                rate
            };
        });

        results.sort((a, b) => a.learnerName.localeCompare(b.learnerName));
        setData(results);
        showSuccess(`Aggregated attendance for ${results.length} learners.`);

    } catch (e) {
        console.error(e);
        showError("Failed to aggregate attendance.");
    } finally {
        setLoading(false);
    }
  };

  return { loading, data, generateReport };
};