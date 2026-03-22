"use client";

import React, { useMemo } from 'react';
import { useTimetable } from '@/hooks/useTimetable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface TimetableGridProps {
  isDocumentMode?: boolean;
}

export const TimetableGrid = ({ isDocumentMode = false }: TimetableGridProps) => {
  const { timetable } = useTimetable();

  const maxPeriod = useMemo(() => {
    if (!timetable || timetable.length === 0) return 0;
    return Math.max(...timetable.map(t => t.period), 0);
  }, [timetable]);

  if (maxPeriod === 0) {
      if (isDocumentMode) {
          return (
              <div className="py-2 text-slate-600 text-sm italic font-medium">
                  The educator's official teaching allocation and master timetable are securely held in the school's central administrative repository.
              </div>
          );
      }

      return (
          <div className="py-10 text-center border-2 border-dashed rounded-xl bg-muted/5 print:border-none print:text-left print:p-2 print:text-black">
              <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2 no-print" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground no-print">No Timetable Configured</p>
              <p className="text-[9px] text-muted-foreground mt-1 no-print">Set up your teaching schedule in Settings {'>'} Academic.</p>
              <p className="hidden print:block text-sm text-slate-800 font-medium">The educator's official teaching allocation and master timetable are securely held in the school's central administrative repository.</p>
          </div>
      );
  }

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  return (
    <div className={cn("overflow-hidden bg-white print-avoid-break", isDocumentMode ? "border-slate-200 border rounded-xl" : "border rounded-xl shadow-sm")}>
      <Table className="table-fixed w-full border-collapse">
        <TableHeader>
          <TableRow className={cn("border-b", isDocumentMode ? "bg-slate-50" : "bg-slate-50")}>
            <TableHead className={cn("w-16 text-center font-black text-[9px] uppercase tracking-widest border-r", isDocumentMode ? "text-slate-800" : "text-slate-400")}>Per</TableHead>
            {DAYS.map(day => (
              <TableHead key={day} className={cn("text-center font-black text-[10px] uppercase tracking-widest border-r last:border-r-0", isDocumentMode ? "text-slate-800" : "text-slate-700")}>
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map(period => (
            <TableRow key={period} className="h-16 border-b last:border-b-0 group">
              <TableCell className={cn("text-center border-r", isDocumentMode ? "bg-transparent" : "bg-slate-50/50")}>
                <span className={cn("font-black text-lg transition-colors", isDocumentMode ? "text-slate-500" : "text-slate-200 group-hover:text-primary")}>{period}</span>
              </TableCell>
              {DAYS.map(day => {
                const entry = getEntry(day, period);
                const isBreak = entry?.class_name === "BREAK";
                
                return (
                  <TableCell key={`${day}-${period}`} className={cn(
                    "p-2 align-top border-r last:border-r-0 transition-colors",
                    isBreak ? (isDocumentMode ? "bg-transparent" : "bg-amber-50/30") : "bg-white",
                    isDocumentMode && "border-slate-200"
                  )}>
                    {entry ? (
                      <div className="flex flex-col h-full justify-between overflow-hidden">
                        <div className="space-y-0.5">
                            <p className={cn(
                                "text-[11px] font-black leading-none truncate",
                                isBreak ? (isDocumentMode ? "text-black" : "text-amber-700") : "text-slate-900"
                            )}>
                                {entry.class_name}
                            </p>
                            <p className={cn("text-[9px] font-bold truncate uppercase tracking-tighter", isDocumentMode ? "text-slate-600" : "text-slate-400")}>
                                {entry.subject}
                            </p>
                        </div>
                        {(entry.start_time || entry.end_time) && (
                            <div className={cn("mt-auto pt-1 flex items-center gap-1 text-[8px] font-bold uppercase", isDocumentMode ? "text-slate-500" : "text-slate-300")}>
                                <span>{entry.start_time || '--:--'}</span>
                                <span>-</span>
                                <span>{entry.end_time || '--:--'}</span>
                            </div>
                        )}
                      </div>
                    ) : (
                      <div className={cn("h-full w-full flex items-center justify-center transition-opacity", isDocumentMode ? "hidden" : "opacity-5 group-hover:opacity-10")}>
                         <div className="w-full h-px bg-slate-200 rotate-12" />
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};