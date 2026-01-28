import { useAcademic } from "@/context/AcademicContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { CalendarClock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const TermProgressWidget = () => {
  const { activeTerm } = useAcademic();

  if (!activeTerm) return null;

  if (!activeTerm.start_date || !activeTerm.end_date) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Term Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-2 text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-20" />
            <p>Dates not configured for {activeTerm.name}.</p>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/settings">Set Dates</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const start = new Date(activeTerm.start_date);
  const end = new Date(activeTerm.end_date);
  const now = new Date();

  const totalDays = differenceInDays(end, start);
  const daysPassed = differenceInDays(now, start);
  
  let percentage = 0;
  let statusText = "";

  if (isFuture(start)) {
    percentage = 0;
    statusText = `Starts in ${Math.abs(daysPassed)} days`;
  } else if (isPast(end)) {
    percentage = 100;
    statusText = "Term Ended";
  } else {
    percentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    const daysLeft = differenceInDays(end, now);
    statusText = `${daysLeft} days remaining`;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    {activeTerm.name} Timeline
                </CardTitle>
                <CardDescription>
                    {format(start, 'd MMM')} - {format(end, 'd MMM yyyy')}
                </CardDescription>
            </div>
            <span className="text-xs font-mono font-medium bg-muted px-2 py-1 rounded">
                Week {Math.ceil((daysPassed > 0 ? daysPassed : 1) / 7)}
            </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className={percentage > 90 ? "text-amber-600 font-bold" : ""}>{percentage.toFixed(0)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{statusText}</span>
            {percentage >= 100 && !activeTerm.closed && (
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <Link to="/settings">Close Term</Link>
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};