import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Clock, BookOpen, Timer } from "lucide-react";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TimetableWidget = () => {
  const { periods, currentPeriod, nextPeriod } = useCurrentPeriod();
  const today = format(new Date(), 'EEEE');
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Today's Schedule
                </CardTitle>
                <CardDescription>{today}</CardDescription>
            </div>
            <Link to="/settings" className="text-xs text-muted-foreground hover:underline">
                Edit
            </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[350px] pr-2">
        {periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mb-2 opacity-20" />
                <p>No classes scheduled for today.</p>
                <Button variant="link" size="sm" asChild>
                    <Link to="/settings">Configure Timetable</Link>
                </Button>
            </div>
        ) : (
            <div className="space-y-3">
                {currentPeriod && (
                    <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-3 animate-pulse-slow">
                        <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-primary text-white">LIVE NOW</Badge>
                            <span className="text-[10px] font-bold text-primary uppercase">Period {currentPeriod.period}</span>
                        </div>
                        <h4 className="font-bold text-lg">{currentPeriod.class_name}</h4>
                        <p className="text-xs text-muted-foreground">{currentPeriod.subject}</p>
                        {currentPeriod.class_id && (
                             <Button size="sm" className="w-full mt-3 h-8 text-xs" asChild>
                                <Link to={`/classes/${currentPeriod.class_id}`}>
                                    Open Register <ArrowRight className="ml-2 h-3 w-3" />
                                </Link>
                             </Button>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    {periods.map((entry) => {
                        const isCurrent = entry.isCurrent;
                        if (isCurrent) return null; // Already shown above

                        return (
                            <div 
                                key={entry.id} 
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg border bg-card transition-colors",
                                    entry === nextPeriod ? "border-primary/30 bg-primary/[0.02]" : "hover:bg-muted/50"
                                )}
                            >
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-8 h-8 rounded text-sm font-bold",
                                    entry === nextPeriod ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {entry.period}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm truncate">{entry.class_name || "Untitled"}</span>
                                        {entry === nextPeriod && <span className="text-[10px] font-bold text-primary uppercase">Next</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>{entry.subject}</span>
                                    </div>
                                </div>
                                {entry.class_id && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                        <Link to={`/classes/${entry.class_id}`}>
                                            <ArrowRight className="h-4 w-4" />
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