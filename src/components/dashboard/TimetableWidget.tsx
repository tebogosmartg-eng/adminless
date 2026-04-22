"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  CalendarClock,
  Clock,
  Notebook,
  ChevronRight,
  AlertCircle,
  BookOpen,
  CheckCircle2
} from "lucide-react";

import { format } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LessonLogDialog } from "./LessonLogDialog";

export const TimetableWidget = () => {
  const today = format(new Date(), "EEEE");
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const timetable: any[] = [];
  const loading = false;
  void loading;

  const loggedPeriods = new Set<string>();

  const [activeLog, setActiveLog] = useState<{
    open: boolean;
    timetableId: string;
    className: string;
    subject: string;
    grade: string;
  } | null>(null);

  const handleOpenLog = (entry: any) => {
    void entry;
  };

  return (
    <>
      <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="pb-1.5 pt-3 px-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <Notebook className="h-4 w-4 text-primary" />
                Daily Agenda
              </CardTitle>

              <CardDescription className="text-[10px] uppercase font-black">
                {today}
              </CardDescription>
            </div>

            <Link to="/settings">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3">
          <ScrollArea className="h-[300px] pr-2">

            {timetable.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No schedule set.
              </div>
            ) : (
              <div className="space-y-1.5">

                {timetable.map((entry) => {
                  const hasLog = loggedPeriods.has(entry.id);

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "p-2 rounded-lg border",
                        entry.isCurrent && "border-primary bg-primary/5",
                        entry.isPast && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">

                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold bg-muted rounded">
                          {entry.period}
                        </div>

                        <div className="flex-1">
                          <div className="text-xs font-bold">
                            {entry.class_name || "Free"}
                          </div>

                          <div className="text-[9px] text-muted-foreground">
                            {entry.startTime}-{entry.endTime}
                          </div>
                        </div>

                        {entry.class_id && (
                          <Button
                            size="icon"
                            variant={hasLog ? "secondary" : "outline"}
                            onClick={() => handleOpenLog(entry)}
                          >
                            {hasLog ? <CheckCircle2 /> : <BookOpen />}
                          </Button>
                        )}

                      </div>
                    </div>
                  );
                })}

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