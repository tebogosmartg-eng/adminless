"use client";

import React, { useMemo, useEffect, useRef } from 'react';
import { useTimetable } from '@/hooks/useTimetable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarClock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface TimetableGridProps {
  isDocumentMode?: boolean;
}

export const TimetableGrid = ({ isDocumentMode = false }: TimetableGridProps) => {
  const { timetable, error, isLoading, isFetching } = useTimetable();
  const lastToastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!error?.message) return;
    if (lastToastKey.current === error.message) return;
    lastToastKey.current = error.message;
    showError("Failed to load data");
  }, [error?.message]);

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

      if (isLoading && !error) {
        return (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
            Loading…
          </div>
        );
      }

      return (
          <div className="space-y-3 py-6 print:border-none print:text-left print:p-2 print:text-black">
              {error && (
                <Alert variant="destructive" className="no-print">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Failed to load data</AlertTitle>
                  <AlertDescription>Connection issue, please retry.</AlertDescription>
                </Alert>
              )}
              <div className="py-10 text-center border-2 border-dashed rounded-xl bg-muted/5 print:border-none">
              <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2 no-print" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground no-print">{error ? 'Timetable unavailable' : 'No Timetable Configured'}</p>
              <p className="text-[9px] text-muted-foreground mt-1 no-print">{error ? '' : <>Set up your teaching schedule in Settings {'>'} Academic.</>}</p>
              <p className="hidden print:block text-sm text-slate-800 font-medium">The educator's official teaching allocation and master timetable are securely held in the school's central administrative repository.</p>
              </div>
          </div>
      );
  }

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  return (
    <div className={cn("overflow-x-auto w-full max-w-[calc(100vw-2.5rem)] md:max-w-full print-avoid-break no-scrollbar", isDocumentMode ? "bg-white border-slate-200 border rounded-xl text-slate-900" : "bg-card text-card-foreground border border-border rounded-xl shadow-sm")}>
      {error && (
        <Alert variant="destructive" className="m-3 mb-0 no-print">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load data</AlertTitle>
          <AlertDescription>Connection issue, please retry.</AlertDescription>
        </Alert>
      )}
      {isFetching && !isLoading && (
        <p className="flex items-center gap-2 px-3 pt-2 text-xs text-muted-foreground no-print" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
          Updating…
        </p>
      )}
      <Table className="table-fixed min-w-[600px] w-full border-collapse">
        <TableHeader>
          <TableRow className={cn("border-b", isDocumentMode ? "bg-slate-50 border-slate-200" : "bg-muted/50 border-border")}>
            <TableHead className={cn("w-16 text-center font-black text-[9px] uppercase tracking-widest border-r", isDocumentMode ? "text-slate-800 border-slate-200" : "text-muted-foreground border-border")}>Per</TableHead>
            {DAYS.map(day => (
              <TableHead key={day} className={cn("text-center font-black text-[10px] uppercase tracking-widest border-r last:border-r-0", isDocumentMode ? "text-slate-800 border-slate-200" : "text-foreground border-border")}>
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map(period => (
            <TableRow key={period} className="h-16 border-b border-border last:border-b-0 group">
              <TableCell className={cn("text-center border-r sticky left-0 z-10", isDocumentMode ? "bg-white border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : "bg-muted/90 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] backdrop-blur-sm")}>
                <span className={cn("font-black text-lg transition-colors", isDocumentMode ? "text-slate-500" : "text-muted-foreground group-hover:text-primary")}>{period}</span>
              </TableCell>
              {DAYS.map(day => {
                const entry = getEntry(day, period);
                const isBreak = entry?.class_name === "BREAK";
                
                return (
                  <TableCell key={`${day}-${period}`} className={cn(
                    "p-2 align-top border-r last:border-r-0 transition-colors",
                    isBreak ? (isDocumentMode ? "bg-transparent" : "bg-amber-50/30 dark:bg-amber-950/10") : (isDocumentMode ? "bg-white" : "bg-background"),
                    isDocumentMode ? "border-slate-200" : "border-border"
                  )}>
                    {entry ? (
                      <div className="flex flex-col h-full justify-between overflow-hidden">
                        <div className="space-y-0.5">
                            <p className={cn(
                                "text-[11px] font-black leading-none truncate",
                                isBreak ? (isDocumentMode ? "text-black" : "text-amber-700 dark:text-amber-500") : (isDocumentMode ? "text-slate-900" : "text-foreground")
                            )}>
                                {entry.class_name}
                            </p>
                            <p className={cn("text-[9px] font-bold truncate uppercase tracking-tighter", isDocumentMode ? "text-slate-600" : "text-muted-foreground")}>
                                {entry.subject}
                            </p>
                        </div>
                        {(entry.start_time || entry.end_time) && (
                            <div className={cn("mt-auto pt-1 flex items-center gap-1 text-[8px] font-bold uppercase", isDocumentMode ? "text-slate-500" : "text-muted-foreground opacity-60")}>
                                <span>{entry.start_time || '--:--'}</span>
                                <span>-</span>
                                <span>{entry.end_time || '--:--'}</span>
                            </div>
                        )}
                      </div>
                    ) : (
                      <div className={cn("h-full w-full flex items-center justify-center transition-opacity", isDocumentMode ? "hidden" : "opacity-5 group-hover:opacity-10")}>
                         <div className="w-full h-px bg-muted-foreground rotate-12" />
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