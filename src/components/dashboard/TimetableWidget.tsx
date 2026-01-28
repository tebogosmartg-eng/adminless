import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Clock, BookOpen } from "lucide-react";
import { useTimetable } from "@/hooks/useTimetable";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const TimetableWidget = () => {
  const { timetable } = useTimetable();
  const today = format(new Date(), 'EEEE'); // e.g. "Monday"
  
  const daysSchedule = timetable
    .filter(t => t.day === today)
    .sort((a, b) => a.period - b.period);

  const nextClass = daysSchedule.find(t => {
      // Logic to find "next" based on time? 
      // Without strict times, we just show the whole day or highlight based on period index if we knew current period?
      // Let's just show the list for today.
      return true; 
  });

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
      <CardContent className="flex-1 overflow-auto max-h-[300px] pr-2">
        {daysSchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mb-2 opacity-20" />
                <p>No classes scheduled for today.</p>
                <Button variant="link" size="sm" asChild>
                    <Link to="/settings">Configure Timetable</Link>
                </Button>
            </div>
        ) : (
            <div className="space-y-3">
                {daysSchedule.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-primary/10 rounded-md text-primary font-bold text-lg">
                            {entry.period}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm truncate">{entry.class_name || "Untitled Class"}</span>
                                {entry.subject && (
                                    <Badge variant="secondary" className="text-[10px] h-5">{entry.subject}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <BookOpen className="h-3 w-3" />
                                <span>Period {entry.period}</span>
                            </div>
                        </div>
                        {entry.class_id && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                <Link to={`/classes/${entry.class_id}`} title="Go to Class">
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
};