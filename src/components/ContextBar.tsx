"use client";

import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  ChevronRight, 
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  FileEdit,
  ArrowLeft,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { useMemo } from 'react';
import { Button } from "@/components/ui/button";

export const ContextBar = () => {
  const { activeYear, activeTerm, assessments, marks: allMarks } = useAcademic();
  const { classes } = useClasses();
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const currentClass = classId ? classes.find(c => c.id === classId) : null;
  const isClassPage = location.pathname.includes('/classes/') && currentClass;
  
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
        "border-b px-4 md:px-8 h-auto min-h-10 py-2 flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-wider z-20 sticky top-0 md:relative overflow-hidden no-print transition-all duration-500 gap-y-2",
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

      <div className="flex items-center gap-3 shrink-0 md:pl-4">
        <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-md transition-all cursor-default opacity-80", isGuided ? "bg-white/10 text-white" : "bg-green-50 text-green-700")}>
            <CheckCircle2 className="h-3 w-3" />
            <span className="hidden sm:inline">Cloud Active</span>
        </div>
      </div>
    </div>
  );
};