"use client";

import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  ChevronRight, 
  RefreshCw, 
  CloudUpload,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  FileEdit,
  ArrowLeft,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/context/SyncContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export const ContextBar = () => {
  const { activeYear, activeTerm, assessments, marks: allMarks } = useAcademic();
  const { classes } = useClasses();
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, isSyncing, syncProgress, pendingChanges, forceSync } = useSync();

  const currentClass = classId ? classes.find(c => c.id === classId) : null;
  const isClassPage = location.pathname.includes('/classes/') && currentClass;
  
  // Detect if we are in guided setup mode
  const isGuided = location.state?.fromOnboarding;

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

  const markingDebt = useMemo(() => {
    if (!isClassPage || assessments.length === 0) return 0;
    const totalExpected = assessments.length * currentClass.learners.length;
    const recordedCount = allMarks.filter(m => m.score !== null).length;
    return totalExpected - recordedCount;
  }, [isClassPage, assessments, allMarks, currentClass]);

  if (!activeYear && !activeTerm && !isClassPage && !isGuided) return null;

  const otherClasses = classes.filter(c => c.id !== classId && !c.archived);

  return (
    <div className={cn(
        "border-b px-4 md:px-8 h-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider z-20 sticky top-0 md:relative overflow-hidden no-print transition-all duration-500",
        isGuided ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"
    )}>
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {isGuided ? (
            <div className="flex items-center gap-4 animate-in slide-in-from-left-4">
                <div className="flex items-center gap-2">
                    <Rocket className="h-3 w-3 animate-pulse" />
                    <span>Setup Mode Active</span>
                </div>
                <div className="h-3 w-px bg-white/20" />
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] font-black uppercase text-white hover:bg-white/10 gap-1.5"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="h-3 w-3" /> Finish & Return to Dashboard
                </Button>
            </div>
        ) : (
            <>
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
                            {activeTerm?.name || "Term"}
                            {activeTerm?.closed && " (Finalised)"}
                        </Badge>
                    </div>
                </div>

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
                        </div>
                        </div>
                    </>
                )}
            </>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-4">
         <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button 
                        onClick={() => forceSync()}
                        className={cn(
                            "flex items-center gap-2 px-2.5 py-1 rounded-md transition-all",
                            isGuided 
                                ? "bg-white/10 text-white" 
                                : isSyncing ? "bg-blue-50 text-blue-600" : pendingChanges > 0 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                        )}
                    >
                        {isSyncing ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : pendingChanges > 0 ? (
                            <CloudUpload className="h-3 w-3" />
                        ) : (
                            <CheckCircle2 className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">
                            {isSyncing ? `Syncing... ${syncProgress > 0 ? `${syncProgress}%` : ''}` : pendingChanges > 0 ? `${pendingChanges} pending` : "Safe in Cloud"}
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    {pendingChanges > 0 ? "Changes saving to Supabase..." : "Your data is backed up and synced."}
                </TooltipContent>
            </Tooltip>
         </TooltipProvider>

         {!isOnline && (
            <div className={cn("flex items-center gap-1.5 px-2", isGuided ? "text-white/60" : "text-muted-foreground")}>
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Offline</span>
            </div>
         )}
      </div>
    </div>
  );
};