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
      <CardHeader className="pb-2 pt-4 px-6">
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
      <CardContent className="flex-1 overflow-auto max-h-[400px] px-4 pb-4">
        {periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs text-center">
                <Clock className="h-8 w-8 mb-2 opacity-10" />
                <p className="font-medium">No schedule set for today.</p>
                <Button variant="link" size="sm" asChild className="text-primary mt-0.5 text-[11px]">
                    <Link to="/settings">Set routine</Link>
                </Button>
            </div>
        ) : (
            <div className="space-y-2">
                {periods.map((entry) => (
                    <div 
                        key={entry.id} 
                        className={cn(
                            "flex flex-col p-2.5 rounded-lg border transition-all duration-300",
                            entry.isCurrent ? "border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary/10 scale-[1.01]" : 
                            entry.isPast ? "opacity-50 border-transparent bg-muted/20" : "border-border bg-card"
                        )}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={cn(
                                "flex flex-col items-center justify-center w-8 h-8 rounded text-[11px] font-black shrink-0",
                                entry.isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {entry.period}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0">
                                    <span className={cn("font-bold text-xs truncate", entry.isCurrent && "text-primary")}>
                                        {entry.class_name || "Free"}
                                    </span>
                                    {entry.isCurrent && <Badge className="h-3.5 px-1 text-[8px] uppercase tracking-tighter bg-primary">Active</Badge>}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                                    <Clock className="h-2 w-2" />
                                    <span>{entry.startTime}-{entry.endTime}</span>
                                    <span className="opacity-30">•</span>
                                    <span>{entry.subject}</span>
                                </div>
                            </div>

                            <div className="flex gap-0.5">
                                {entry.class_name && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => setLogSession({ id: entry.id, name: entry.class_name })}
                                        title="Log Lesson"
                                    >
                                        <FileEdit className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                {entry.class_id && !entry.isPast && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" asChild>
                                        <Link to={`/classes/${entry.class_id}`}>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {entry.class_id && entry.isPendingAttendance && !entry.isPast && (
                            <div className="mt-2 pt-1.5 border-t border-dashed border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Attendance Pending</span>
                                </div>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[9px] font-bold text-amber-700" asChild>
                                    <Link to={`/classes/${entry.class_id}`}>Mark</Link>
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