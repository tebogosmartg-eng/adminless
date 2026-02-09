"use client";

import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  ChevronRight, 
  Users, 
  RefreshCw, 
  CloudUpload,
  CheckCircle2,
  ChevronDown,
  Clock,
  AlertCircle,
  FileEdit,
  LayoutDashboard,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/context/SyncContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { format, differenceInMinutes, differenceInDays, isPast, isFuture } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { Progress } from "@/components/ui/progress";
import { useMemo } from 'react';

export const ContextBar = () => {
  const { activeYear, activeTerm, assessments, marks: allMarks } = useAcademic();
  const { classes } = useClasses();
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, isSyncing, pendingChanges } = useSync();
  const { nextPeriod } = useCurrentPeriod();

  const currentClass = classId ? classes.find(c => c.id === classId) : null;
  const isClassPage = location.pathname.includes('/classes/') && currentClass;

  // 1. Live Attendance Pulse
  const today = format(new Date(), 'yyyy-MM-dd');
  const attendancePulse = useLiveQuery(async () => {
    if (!classId) return null;
    const records = await db.attendance
        .where('class_id')
        .equals(classId)
        .filter(r => r.date === today)
        .toArray();
    
    return { 
        marked: records.length > 0,
        present: records.filter(r => r.status === 'present' || r.status === 'late').length,
        total: currentClass?.learners.length || 0 
    };
  }, [classId, currentClass]);

  // 2. Term Progress Calculation
  const termProgress = useMemo(() => {
    if (!activeTerm?.start_date || !activeTerm?.end_date) return null;
    const start = new Date(activeTerm.start_date);
    const end = new Date(activeTerm.end_date);
    const now = new Date();
    if (isFuture(start)) return 0;
    if (isPast(end)) return 100;
    const total = differenceInDays(end, start);
    const passed = differenceInDays(now, start);
    return Math.round((passed / total) * 100);
  }, [activeTerm]);

  // 3. Marking Debt (Missing Marks for task tracking)
  const markingDebt = useMemo(() => {
    if (!isClassPage || assessments.length === 0) return 0;
    const totalExpected = assessments.length * currentClass.learners.length;
    const recordedCount = allMarks.filter(m => m.score !== null).length;
    return totalExpected - recordedCount;
  }, [isClassPage, assessments, allMarks, currentClass]);

  if (!activeYear && !activeTerm && !isClassPage) return null;

  const otherClasses = classes.filter(c => c.id !== classId && !c.archived);
  const minsUntilNext = nextPeriod ? differenceInMinutes(nextPeriod.startParsed, new Date()) : null;

  return (
    <div className="bg-white dark:bg-card border-b px-4 md:px-8 h-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider z-20 sticky top-0 md:relative overflow-hidden no-print">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        
        {/* Academic Context + Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{activeYear?.name || "Year"}</span>
          </div>
          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn(
                "h-4.5 px-1.5 text-[9px] font-black border-none gap-1",
                activeTerm?.closed ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
            )}>
                {activeTerm?.closed && <Lock className="h-2 w-2" />}
                {activeTerm?.name || "Term"}
                {activeTerm?.closed && " (Finalised)"}
            </Badge>
            {termProgress !== null && (
                <div className="w-12 group relative flex items-center">
                    <Progress value={termProgress} className="h-1 bg-muted" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {termProgress}% through Term
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Specific Class Context */}
        {isClassPage && (
          <>
            <div className="h-3 w-px bg-border mx-1 shrink-0" />
            <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-left-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 hover:bg-muted px-1.5 py-0.5 rounded transition-colors group">
                    <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-black border-primary/20 text-primary bg-primary/5 group-hover:bg-primary group-hover:text-white transition-colors">
                        {currentClass.className}
                    </Badge>
                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest border-b mb-1">Switch Class</div>
                    {otherClasses.map(c => (
                        <DropdownMenuItem key={c.id} onClick={() => navigate(`/classes/${c.id}`)} className="text-[10px] font-bold">
                            {c.className} ({c.subject})
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Administrative Alerts */}
              <div className="flex items-center gap-2 ml-2">
                  {attendancePulse && !attendancePulse.marked && !activeTerm?.closed && (
                    <Link to={`/classes/${classId}`} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 animate-pulse-slow">
                        <AlertCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">Register Pending</span>
                    </Link>
                  )}

                  {markingDebt > 0 && !activeTerm?.closed && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                        <FileEdit className="h-3 w-3" />
                        <span className="tabular-nums">{markingDebt} missing entries</span>
                    </div>
                  )}

                  {attendancePulse?.marked && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                        <Users className="h-2.5 w-2.5" />
                        <span className="tabular-nums">{attendancePulse.present}/{attendancePulse.total} present</span>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Up Next Prediction */}
      {nextPeriod && (!isClassPage || nextPeriod.class_id !== classId) && (
          <button 
              onClick={() => nextPeriod.class_id && navigate(`/classes/${nextPeriod.class_id}`)}
              className="hidden lg:flex items-center gap-2 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100 transition-colors group shrink-0"
          >
              <Clock className="h-2.5 w-2.5" />
              <span className="text-[9px]">Up Next: <span className="font-black">{nextPeriod.class_name}</span></span>
              {minsUntilNext !== null && minsUntilNext <= 15 && (
                  <span className="bg-amber-200 dark:bg-amber-800 px-1 rounded text-[8px] animate-pulse">
                      {minsUntilNext}m
                  </span>
              )}
          </button>
      )}

      {/* Connection & Sync Status */}
      <div className="flex items-center gap-3 shrink-0 pl-4 bg-gradient-to-l from-white dark:from-card via-white dark:via-card to-transparent">
         {isSyncing ? (
            <div className="flex items-center gap-1.5 text-blue-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Syncing</span>
            </div>
         ) : pendingChanges > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-600">
                <CloudUpload className="h-3 w-3" />
                <span className="hidden sm:inline">{pendingChanges} items</span>
            </div>
         ) : isOnline ? (
            <div className="flex items-center gap-1.5 text-green-600 opacity-60">
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">Synced</span>
            </div>
         ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Offline</span>
            </div>
         )}
      </div>
    </div>
  );
};