"use client";

import { useMemo, useEffect, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  CalendarClock,
  Notebook,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { format } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LessonLogDialog } from "./LessonLogDialog";
import { useTimetable } from "@/hooks/useTimetable";
import { showError } from "@/utils/toast";

export const TimetableWidget = () => {
  const today = format(new Date(), "EEEE");
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const { timetable, error, isLoading, isFetching } = useTimetable();
  const errorToastKey = useRef<string | null>(null);

  const todaySlots = useMemo(() => {
    return [...timetable]
      .filter((t) => t.day === today)
      .sort((a, b) => a.period - b.period);
  }, [timetable, today]);

  useEffect(() => {
    if (!error?.message) return;
    if (errorToastKey.current === error.message) return;
    errorToastKey.current = error.message;
    showError("Failed to load data");
  }, [error?.message]);

  const loggedPeriods = new Set<string>();

  const [activeLog, setActiveLog] = useState<{
    open: boolean;
    timetableId: string;
    className: string;
    subject: string;
    grade: string;
  } | null>(null);

  const handleOpenLog = (entry: { id: string; class_name: string; subject: string; class_id?: string | null }) => {
    if (!entry.class_id) return;
    setActiveLog({
      open: true,
      timetableId: entry.id,
      className: entry.class_name || "Class",
      subject: entry.subject || "",
      grade: "",
    });
  };

  const showInitialSkeleton = isLoading && todaySlots.length === 0 && !error;

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

        <CardContent className="px-3 pb-3 space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load data</AlertTitle>
              <AlertDescription>Connection issue, please retry.</AlertDescription>
            </Alert>
          )}
          {isFetching && !isLoading && todaySlots.length > 0 && (
            <p className="flex items-center gap-2 text-[10px] text-muted-foreground px-1" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
              Updating…
            </p>
          )}
          <ScrollArea className="h-[300px] pr-2">
            {showInitialSkeleton ? (
              <div className="space-y-2 py-4 px-1">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : todaySlots.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                {error ? "Schedule unavailable." : "No schedule set."}
              </div>
            ) : (
              <div className="space-y-1.5">
                {todaySlots.map((entry) => {
                  const hasLog = loggedPeriods.has(entry.id);
                  const now = new Date();
                  const startParts = (entry.start_time || "").split(":").map(Number);
                  const endParts = (entry.end_time || "").split(":").map(Number);
                  const startM = (startParts[0] || 0) * 60 + (startParts[1] || 0);
                  const endM = (endParts[0] || 0) * 60 + (endParts[1] || 0);
                  const curM = now.getHours() * 60 + now.getMinutes();
                  const isCurrent = endM > startM && curM >= startM && curM <= endM;
                  const isPast = endM > startM && curM > endM;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "p-2 rounded-lg border",
                        isCurrent && "border-primary bg-primary/5",
                        isPast && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold bg-muted rounded">
                          {entry.period}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">
                            {entry.class_name || "Free"}
                          </div>

                          <div className="text-[9px] text-muted-foreground">
                            {entry.start_time}-{entry.end_time}
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
