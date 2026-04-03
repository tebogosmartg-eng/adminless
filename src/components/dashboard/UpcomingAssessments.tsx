import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export const UpcomingAssessments = () => {
  const { assessments, activeTerm } = useAcademic();
  const { classes } = useClasses();

  const upcomingList = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];

    // Filter for current term and future/recent dates
    const relevant = assessments.filter(a => a.term_id === activeTerm?.id && a.date);
    
    // Enrich with class names
    const enriched = relevant.map(a => {
        const cls = classes.find(c => c.id === a.class_id);
        return {
            ...a,
            className: cls?.className || 'Unknown Class',
            subject: cls?.subject || 'Unknown Subject',
            dateObj: new Date(a.date!)
        };
    });

    // Sort by date ascending
    return enriched
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .filter(a => !isPast(a.dateObj) || isToday(a.dateObj)) // Only show today or future
        .slice(0, 5); // Limit to 5
  }, [assessments, activeTerm, classes]);

  if (upcomingList.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Upcoming
          </CardTitle>
          <CardDescription>No assessments scheduled for the near future.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Upcoming
        </CardTitle>
        <CardDescription>Assessments scheduled for {activeTerm?.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingList.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="font-semibold text-sm truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground truncate">{item.subject} • {item.className}</span>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={isToday(item.dateObj) ? "destructive" : "outline"}>
                  {isToday(item.dateObj) ? "Today" : format(item.dateObj, "d MMM")}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{item.type}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-2 border-t text-center">
            <Link to="/classes" className="text-xs text-primary hover:underline h-10 flex items-center justify-center font-medium">
                View All in Classes
            </Link>
        </div>
      </CardContent>
    </Card>
  );
};