"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, Notebook, ChevronRight, AlertCircle, BookOpen, CheckCircle2 } from "lucide-react";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClasses } from '@/context/ClassesContext';
import { LessonLogDialog } from './LessonLogDialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export const TimetableWidget = () => {
  const { periods } = useCurrentPeriod();
  const { classes } = useClasses();
  const today = format(new Date(), 'EEEE');
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  const [activeLog, setActiveLog] = useState<{
      open: boolean;
      timetableId: string;
      className: string;
      subject: string;
      grade: string;
  } | null>(null);

  // Quick check to see which periods already have a log for today
  const loggedPeriods = useLiveQuery(async () => {
      const logs = await db.lesson_logs.where('date').equals(todayDateStr).toArray();
      return new Set(logs.map(l => l.timetable_id));
  }, [todayDateStr]) || new Set();

  const handleOpenLog = (entry: any) => {
      if (!entry.class_id) return;
      const cls = classes.find(c => c.id === entry.class_id);
      if (!cls) return;

      setActiveLog({
          open: true,
          timetableId: entry.id,
          className: cls.className,
          subject: cls.subject,
          grade: cls.grade
      });
  };

  return (
    <>
        <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="pb-1.5 pt-3 px-4">
            <div className="flex justify-between items-start">
                <div className="space-y-0">
                    <CardTitle className="text-base flex items-center gap-2 font-bold">
                        <Notebook className="h-4 w-4 text-primary" />
                        Daily Agenda
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{today}</CardDescription>
                </div>
                <Link to="/settings" className="p-1 hover:bg-muted rounded transition-colors" title="Edit Schedule">
                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
            </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
            <ScrollArea className="h-[300px] pr-2">
                {periods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs text-center">
                        <Clock className="h-7 w-7 mb-1.5 opacity-10" />
                        <p className="font-medium">No schedule set for today.</p>
                        <Button variant="link" size="sm" asChild className="text-primary mt-0.5 text-[11px] h-auto p-0">
                            <Link to="/settings">Set routine</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {periods.map((entry) => {
                            const hasLog = loggedPeriods.has(entry.id);

                            return (
                            <div 
                                key={entry.id} 
                                className={cn(
                                    "flex flex-col p-2 rounded-lg border transition-all duration-300",
                                    entry.isCurrent ? "border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary/10" : 
                                    entry.isPast ? "opacity-50 border-transparent bg-muted/10 hover:opacity-100" : "border-border bg-card"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "flex flex-col items-center justify-center w-7 h-7 rounded text-[10px] font-black shrink-0",
                                        entry.isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {entry.period}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 mb-0">
                                            <span className={cn("font-bold text-xs truncate", entry.isCurrent && "text-primary")}>
                                                {entry.class_name || "Free"}
                                            </span>
                                            {entry.isCurrent && <Badge className="h-3 px-1 text-[7px] uppercase tracking-tighter bg-primary">Active</Badge>}
                                        </div>
                                        <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase tracking-tight">
                                            <Clock className="h-2 w-2" />
                                            <span>{entry.startTime}-{entry.endTime}</span>
                                            <span className="opacity-30">•</span>
                                            <span className="truncate">{entry.subject}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 shrink-0">
                                        {entry.class_id && (entry.isCurrent || entry.isPast) && (
                                            <Button 
                                                variant={hasLog ? "secondary" : "outline"} 
                                                size="icon" 
                                                className={cn("h-6 w-6", hasLog && "text-green-600 bg-green-50 hover:bg-green-100")} 
                                                onClick={() => handleOpenLog(entry)}
                                                title={hasLog ? "Edit Lesson Log" : "Log Work Covered"}
                                            >
                                                {hasLog ? <CheckCircle2 className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                                            </Button>
                                        )}
                                        {entry.class_id && !entry.isPast && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" asChild>
                                                <Link to={`/classes/${entry.class_id}`}>
                                                    <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {entry.class_id && entry.isPendingAttendance && !entry.isPast && (
                                    <div className="mt-1.5 pt-1 border-t border-dashed border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                                            <AlertCircle className="h-2.5 w-2.5" />
                                            <span className="text-[8px] font-black uppercase tracking-tighter">Attendance Pending</span>
                                        </div>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-[8px] font-bold text-amber-700" asChild>
                                            <Link to={`/classes/${entry.class_id}`}>Mark</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                )}
            </ScrollArea>
        </CardContent>
        </Card>

        {activeLog && (
            <LessonLogDialog 
                open={activeLog.open}
                onOpenChange={(open) => !open && setActiveLog(null)}
                timetableId={activeLog.timetableId}
                className={activeLog.className}
                subject={activeLog.subject}
                grade={activeLog.grade}
                date={todayDateStr}
            />
        )}
    </>
  );
};