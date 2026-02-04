import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Clock, Notebook, ChevronRight } from "lucide-react";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TimetableWidget = () => {
  const { periods, currentPeriod, nextPeriod } = useCurrentPeriod();
  const today = format(new Date(), 'EEEE');
  
  return (
    <Card className="h-full flex flex-col border-none shadow-sm bg-white dark:bg-card">
      <CardHeader className="pb-3 px-6">
        <div className="flex justify-between items-start">
            <div className="space-y-0.5">
                <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Notebook className="h-5 w-5 text-primary" />
                    Daily Routine
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{today}</CardDescription>
            </div>
            <Link to="/settings" className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Edit Routine">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[400px] px-6 pb-6">
        {periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center">
                <Clock className="h-10 w-10 mb-4 opacity-10" />
                <p className="font-medium">No routine set for today.</p>
                <Button variant="link" size="sm" asChild className="text-primary mt-1">
                    <Link to="/settings">Set your teaching schedule</Link>
                </Button>
            </div>
        ) : (
            <div className="space-y-4">
                {currentPeriod && (
                    <div className="bg-primary/[0.03] border-2 border-primary/10 rounded-xl p-4 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 h-auto">
                                Current Focus
                            </Badge>
                            <span className="text-[10px] font-black text-primary/60 uppercase">Session {currentPeriod.period}</span>
                        </div>
                        <h4 className="font-black text-xl tracking-tight leading-none mb-1">{currentPeriod.class_name}</h4>
                        <p className="text-xs font-bold text-muted-foreground mb-4">{currentPeriod.subject}</p>

                        {currentPeriod.class_id && (
                             <Button size="sm" className="w-full h-9 rounded-lg font-bold shadow-sm" asChild>
                                <Link to={`/classes/${currentPeriod.class_id}`}>
                                    View Class Profile <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Link>
                             </Button>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Remaining Schedule</h5>
                    {periods.map((entry) => {
                        const isCurrent = entry.isCurrent;
                        if (isCurrent) return null;

                        const isNext = entry === nextPeriod;

                        return (
                            <div 
                                key={entry.id} 
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                    isNext ? "border-primary/40 bg-primary/[0.01] shadow-sm" : "bg-muted/20 border-transparent hover:bg-muted/40"
                                )}
                            >
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-7 h-7 rounded text-[11px] font-black",
                                    isNext ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {entry.period}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm truncate">{entry.class_name || "Free Period"}</span>
                                        {isNext && <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Up Next</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground">{entry.subject}</p>
                                </div>
                                {entry.class_id && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                        <Link to={`/classes/${entry.class_id}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};