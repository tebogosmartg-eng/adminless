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
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Term Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-1 text-xs text-muted-foreground">
            <AlertCircle className="h-6 w-6 opacity-20" />
            <p>Dates not configured.</p>
            <Button variant="link" size="sm" asChild className="h-auto p-0 text-[11px]">
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
    statusText = `${daysLeft} days left`;
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    {activeTerm.name} Timeline
                </CardTitle>
                <CardDescription className="text-[10px]">
                    {format(start, 'd MMM')} - {format(end, 'd MMM yyyy')}
                </CardDescription>
            </div>
            <span className="text-[9px] font-black bg-muted px-1.5 py-0.5 rounded">
                W{Math.ceil((daysPassed > 0 ? daysPassed : 1) / 7)}
            </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                <span>Progress</span>
                <span className={percentage > 90 ? "text-amber-600 font-bold" : ""}>{percentage.toFixed(0)}%</span>
            </div>
            <Progress value={percentage} className="h-1.5" />
        </div>
        
        <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">{statusText}</span>
            {percentage >= 100 && !activeTerm.closed && (
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-bold" asChild>
                    <Link to="/settings">Close Term</Link>
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};