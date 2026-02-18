"use client";

import React, { useMemo } from 'react';
import { useTimetable } from '@/hooks/useTimetable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableGrid = () => {
  const { timetable } = useTimetable();

  const maxPeriod = useMemo(() => {
    if (!timetable || timetable.length === 0) return 8;
    return Math.max(...timetable.map(t => t.period), 8);
  }, [timetable]);

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm print:shadow-none">
      <Table className="table-fixed w-full border-collapse">
        <TableHeader>
          <TableRow className="bg-slate-50 border-b">
            <TableHead className="w-16 text-center font-black text-[9px] uppercase tracking-widest text-slate-400 border-r">Per</TableHead>
            {DAYS.map(day => (
              <TableHead key={day} className="text-center font-black text-[10px] uppercase tracking-widest text-slate-700 border-r last:border-r-0">
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map(period => (
            <TableRow key={period} className="h-16 border-b last:border-b-0 group">
              <TableCell className="bg-slate-50/50 text-center border-r">
                <span className="font-black text-lg text-slate-200 group-hover:text-primary transition-colors">{period}</span>
              </TableCell>
              {DAYS.map(day => {
                const entry = getEntry(day, period);
                const isBreak = entry?.class_name === "BREAK";
                
                return (
                  <TableCell key={`${day}-${period}`} className={cn(
                    "p-2 align-top border-r last:border-r-0 transition-colors",
                    isBreak ? "bg-amber-50/30" : "bg-white"
                  )}>
                    {entry ? (
                      <div className="flex flex-col h-full justify-between overflow-hidden">
                        <div className="space-y-0.5">
                            <p className={cn(
                                "text-[11px] font-black leading-none truncate",
                                isBreak ? "text-amber-700" : "text-slate-900"
                            )}>
                                {entry.class_name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">
                                {entry.subject}
                            </p>
                        </div>
                        {(entry.start_time || entry.end_time) && (
                            <div className="mt-auto pt-1 flex items-center gap-1 text-[8px] font-bold text-slate-300 uppercase">
                                <span>{entry.start_time || '--:--'}</span>
                                <span>-</span>
                                <span>{entry.end_time || '--:--'}</span>
                            </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-5 group-hover:opacity-10 transition-opacity">
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