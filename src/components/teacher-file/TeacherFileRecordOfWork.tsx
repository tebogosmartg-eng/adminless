"use client";

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { BookOpen, Calendar, CheckCircle2, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeacherFileRecordOfWorkProps {
  termId: string;
  classId?: string;
}

export const TeacherFileRecordOfWork = ({ termId, classId }: TeacherFileRecordOfWorkProps) => {
  const logs = useLiveQuery(async () => {
    // 1. Get relevant timetable slots
    let slots = [];
    if (classId) {
        slots = await db.timetable.where('class_id').equals(classId).toArray();
    } else {
        const classes = await db.classes.where('term_id').equals(termId).toArray();
        const classIds = classes.map(c => c.id);
        slots = await db.timetable.where('class_id').anyOf(classIds).toArray();
    }

    const slotIds = slots.map(s => s.id);
    if (slotIds.length === 0) return [];

    // 2. Get logs for those slots in this term's dates
    const allLogs = await db.lesson_logs
        .where('timetable_id')
        .anyOf(slotIds)
        .reverse()
        .sortBy('date');
    
    // 3. Map with class names
    const classes = await db.classes.where('term_id').equals(termId).toArray();
    const classMap = new Map(classes.map(c => [c.id, c.className]));
    const slotMap = new Map(slots.map(s => [s.id, s.class_id]));

    return allLogs.map(log => ({
        ...log,
        className: classMap.get(slotMap.get(log.timetable_id) || "") || "General"
    }));
  }, [termId, classId]) || [];

  if (logs.length === 0) {
      return (
          <div className="py-2 text-slate-600 text-sm italic font-medium print:text-black">
              Curriculum coverage and daily planning records are maintained in the official educator diary or departmental planning portals for this cycle.
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-slate-400" /> Automated Record of Work
          </h4>
          <span className="text-[9px] font-bold text-slate-400">{logs.length} entries consolidated</span>
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-none print:border-slate-300">
          <Table>
              <TableHeader className="bg-slate-50">
                  <TableRow>
                      <TableHead className="w-24 text-[9px] font-black uppercase py-2 text-slate-700 print:text-black">Date</TableHead>
                      <TableHead className="w-20 text-[9px] font-black uppercase py-2 text-slate-700 print:text-black">Class</TableHead>
                      <TableHead className="text-[9px] font-black uppercase py-2 text-slate-700 print:text-black">Work Covered / Topic</TableHead>
                      <TableHead className="w-32 text-[9px] font-black uppercase py-2 text-right text-slate-700 print:text-black">Homework Set</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {/* In screen view, limit to 15. In print view, show all. */}
                  {logs.map((log, idx) => (
                      <TableRow key={log.id} className={cn("group print-avoid-break", idx >= 15 ? "hidden print:table-row" : "")}>
                          <TableCell className="py-2 align-top">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 print:text-slate-800">
                                <Calendar className="h-3 w-3 opacity-30 no-print" />
                                {format(new Date(log.date), 'dd/MM/yy')}
                             </div>
                          </TableCell>
                          <TableCell className="py-2 align-top">
                             <Badge variant="outline" className="text-[8px] h-4 font-black border-slate-200 text-slate-700 print:border-slate-400 print:text-black">{log.className}</Badge>
                          </TableCell>
                          <TableCell className="py-2 align-top">
                             <p className="text-[11px] leading-relaxed text-slate-800 print:text-black" title={log.content}>
                                {log.content}
                             </p>
                          </TableCell>
                          <TableCell className="py-2 text-right align-top">
                             {log.homework ? (
                                 <span className="text-[9px] font-medium text-slate-600 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded block italic print:bg-transparent print:border print:border-slate-300 print:text-slate-800">
                                     "{log.homework}"
                                 </span>
                             ) : (
                                 <span className="text-[8px] text-slate-300 print:text-slate-500">None</span>
                             )}
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
          {logs.length > 15 && (
              <div className="p-2 bg-slate-50 border-t text-center no-print">
                  <p className="text-[8px] font-black uppercase text-slate-400">
                      + {logs.length - 15} additional entries archived in full digital record
                  </p>
              </div>
          )}
      </div>
    </div>
  );
};