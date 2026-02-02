"use client";

import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  BookOpen, 
  GraduationCap, 
  ChevronRight, 
  Users, 
  RefreshCw, 
  CloudUpload,
  CheckCircle2,
  ChevronDown,
  Clock,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/context/SyncContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { format, differenceInMinutes } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";

export const ContextBar = () => {
  const { activeYear, activeTerm } = useAcademic();
  const { classes } = useClasses();
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, isSyncing, pendingChanges } = useSync();
  const { nextPeriod } = useCurrentPeriod();

  const currentClass = classId ? classes.find(c => c.id === classId) : null;
  const isClassPage = location.pathname.includes('/classes/') && currentClass;

  // Live Attendance Pulse for the current class
  const today = format(new Date(), 'yyyy-MM-dd');
  const attendancePulse = useLiveQuery(async () => {
    if (!classId) return null;
    const records = await db.attendance
        .where('class_id')
        .equals(classId)
        .filter(r => r.date === today)
        .toArray();
    
    if (records.length === 0) return null;
    
    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return { present: presentCount, total: currentClass?.learners.length || 0 };
  }, [classId]);

  if (!activeYear && !activeTerm && !isClassPage) return null;

  const otherClasses = classes.filter(c => c.id !== classId && !c.archived);

  // Minutes until next class
  const minsUntilNext = nextPeriod ? differenceInMinutes(nextPeriod.startParsed, new Date()) : null;

  return (
    <div className="bg-white dark:bg-card border-b px-4 md:px-8 h-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider z-20 sticky top-0 md:relative overflow-hidden no-print">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {/* Global Academic Context */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{activeYear?.name || "No Year"}</span>
          </div>
          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />
          <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] font-black bg-primary/10 text-primary border-none">
            {activeTerm?.name || "No Term"}
          </Badge>
        </div>

        {/* Specific Class Context */}
        {isClassPage && (
          <>
            <div className="h-3 w-px bg-border mx-1 shrink-0" />
            <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-1.5 text-foreground/70">
                <GraduationCap className="h-3 w-3 text-muted-foreground" />
                <span>{currentClass.grade}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground/70">
                <BookOpen className="h-3 w-3 text-muted-foreground" />
                <span className="text-primary">{currentClass.subject}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 hover:bg-muted px-1.5 py-0.5 rounded transition-colors">
                    <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-black border-primary/20 text-primary bg-primary/5">
                        {currentClass.className}
                    </Badge>
                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                    <div className="px-2 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest border-b mb-1">Switch Class</div>
                    {otherClasses.length === 0 ? (
                        <div className="px-2 py-2 text-[10px] text-muted-foreground italic">No other active classes</div>
                    ) : (
                        otherClasses.map(c => (
                            <DropdownMenuItem key={c.id} onClick={() => navigate(`/classes/${c.id}`)} className="text-[10px] font-bold">
                                {c.className} ({c.subject})
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
              </DropdownMenu>

              {attendancePulse && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                    <Users className="h-2.5 w-2.5" />
                    <span className="tabular-nums">{attendancePulse.present}/{attendancePulse.total} present</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Up Next - If not on a class page or looking at a different class */}
        {nextPeriod && (!isClassPage || nextPeriod.class_id !== classId) && (
            <>
                <div className="h-3 w-px bg-border mx-1 shrink-0" />
                <button 
                    onClick={() => nextPeriod.class_id && navigate(`/classes/${nextPeriod.class_id}`)}
                    className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100 transition-colors group shrink-0"
                >
                    <Clock className="h-2.5 w-2.5" />
                    <span className="text-[9px]">Up Next: <span className="font-black">{nextPeriod.class_name}</span></span>
                    {minsUntilNext !== null && minsUntilNext <= 15 && (
                        <span className="bg-amber-200 dark:bg-amber-800 px-1 rounded text-[8px] animate-pulse">
                            {minsUntilNext}m
                        </span>
                    )}
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </>
        )}
      </div>

      {/* Sync Status - Integrated into Header */}
      <div className="flex items-center gap-3 shrink-0 pl-4 bg-gradient-to-l from-white dark:from-card via-white dark:via-card to-transparent">
         {isSyncing ? (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
            </div>
         ) : pendingChanges > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <CloudUpload className="h-3 w-3" />
                <span className="hidden sm:inline">{pendingChanges} pending</span>
                <span className="sm:hidden">{pendingChanges}</span>
            </div>
         ) : isOnline ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 opacity-60">
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">Up to date</span>
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