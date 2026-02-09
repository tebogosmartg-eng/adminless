import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, Notebook, ChevronRight, AlertCircle, CheckCircle2, FileEdit } from "lucide-react";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LessonLogDialog } from "./LessonLogDialog";

export const TimetableWidget = () => {
  const { periods } = useCurrentPeriod();
  const today = format(new Date(), 'EEEE');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [logSession, setLogSession] = useState<{ id: string, name: string } | null>(null);
  
  return (
    <Card className="h-full flex flex-col border-none shadow-sm bg-white dark:bg-card">
      <CardHeader className="pb-3 px-6">
        <div className="flex justify-between items-start">
            <div className="space-y-0.5">
                <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Notebook className="h-5 w-5 text-primary" />
                    Daily Agenda
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{today}</CardDescription>
            </div>
            <Link to="/settings" className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Edit Schedule">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[500px] px-6 pb-6">
        {periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center">
                <Clock className="h-10 w-10 mb-4 opacity-10" />
                <p className="font-medium">No schedule set for today.</p>
                <Button variant="link" size="sm" asChild className="text-primary mt-1">
                    <Link to="/settings">Set your teaching routine</Link>
                </Button>
            </div>
        ) : (
            <div className="space-y-3">
                {periods.map((entry) => (
                    <div 
                        key={entry.id} 
                        className={cn(
                            "flex flex-col p-3 rounded-xl border transition-all duration-300",
                            entry.isCurrent ? "border-primary bg-primary/[0.03] shadow-md ring-1 ring-primary/20 scale-[1.02]" : 
                            entry.isPast ? "opacity-50 border-transparent bg-muted/20" : "border-border bg-card"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex flex-col items-center justify-center w-10 h-10 rounded-lg text-xs font-black shrink-0",
                                entry.isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                                <span className="text-[10px] opacity-70 leading-none mb-1">P</span>
                                {entry.period}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={cn("font-bold text-sm truncate", entry.isCurrent && "text-primary")}>
                                        {entry.class_name || "Free Session"}
                                    </span>
                                    {entry.isCurrent && <Badge className="h-4 text-[8px] uppercase tracking-tighter bg-primary">Active Now</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>{entry.startTime} - {entry.endTime}</span>
                                    <span className="opacity-30">•</span>
                                    <span>{entry.subject}</span>
                                </div>
                            </div>

                            <div className="flex gap-1">
                                {entry.class_name && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => setLogSession({ id: entry.id, name: entry.class_name })}
                                        title="Log Lesson Content"
                                    >
                                        <FileEdit className="h-4 w-4" />
                                    </Button>
                                )}
                                {entry.class_id && !entry.isPast && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                        <Link to={`/classes/${entry.class_id}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {entry.class_id && entry.isPendingAttendance && !entry.isPast && (
                            <div className="mt-3 pt-2 border-t border-dashed border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Attendance Pending</span>
                                </div>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold text-amber-700" asChild>
                                    <Link to={`/classes/${entry.class_id}`}>Open Register</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </CardContent>

      {logSession && (
          <LessonLogDialog 
            open={!!logSession}
            onOpenChange={(open) => !open && setLogSession(null)}
            timetableId={logSession.id}
            className={logSession.name}
            date={todayStr}
          />
      )}
    </Card>
  );
};