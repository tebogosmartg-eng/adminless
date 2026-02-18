"use client";

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { BookOpen, Calendar, CheckCircle2, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
          <div className="py-10 text-center border-2 border-dashed rounded-xl bg-muted/5">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Lesson Logs Recorded</p>
              <p className="text-[9px] text-muted-foreground mt-1">Populate logs via the Timetable widget on your Dashboard.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" /> Automated Record of Work
          </h4>
          <span className="text-[9px] font-bold text-slate-400">{logs.length} entries consolidated</span>
      </div>

      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
          <Table>
              <TableHeader className="bg-slate-50">
                  <TableRow>
                      <TableHead className="w-24 text-[9px] font-black uppercase py-2">Date</TableHead>
                      <TableHead className="w-20 text-[9px] font-black uppercase py-2">Class</TableHead>
                      <TableHead className="text-[9px] font-black uppercase py-2">Work Covered / Topic</TableHead>
                      <TableHead className="w-32 text-[9px] font-black uppercase py-2 text-right">Homework Set</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {logs.slice(0, 15).map((log) => (
                      <TableRow key={log.id} className="group">
                          <TableCell className="py-2">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <Calendar className="h-3 w-3 opacity-30" />
                                {format(new Date(log.date), 'dd/MM/yy')}
                             </div>
                          </TableCell>
                          <TableCell className="py-2">
                             <Badge variant="outline" className="text-[8px] h-4 font-black border-slate-200">{log.className}</Badge>
                          </TableCell>
                          <TableCell className="py-2">
                             <p className="text-[11px] leading-tight text-slate-700 line-clamp-2" title={log.content}>
                                {log.content}
                             </p>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                             {log.homework ? (
                                 <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded truncate block max-w-[120px] ml-auto italic">
                                     "{log.homework}"
                                 </span>
                             ) : (
                                 <span className="text-[8px] text-slate-300">None</span>
                             )}
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
          {logs.length > 15 && (
              <div className="p-2 bg-slate-50 border-t text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">
                      + {logs.length - 15} additional entries archived in full digital record
                  </p>
              </div>
          )}
      </div>
    </div>
  );
};