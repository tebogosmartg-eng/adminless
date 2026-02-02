"use client";

import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useParams, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, BookOpen, GraduationCap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ContextBar = () => {
  const { activeYear, activeTerm } = useAcademic();
  const { classes } = useClasses();
  const { classId } = useParams();
  const location = useLocation();

  const currentClass = classId ? classes.find(c => c.id === classId) : null;
  const isClassPage = location.pathname.includes('/classes/') && currentClass;

  if (!activeYear && !activeTerm && !isClassPage) return null;

  return (
    <div className="bg-white dark:bg-card border-b px-4 md:px-8 h-10 flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider overflow-x-auto no-scrollbar z-20 sticky top-0 md:relative">
      {/* Global Academic Context */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{activeYear?.name || "No Year"}</span>
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary border-none">
          {activeTerm?.name || "No Term"}
        </Badge>
      </div>

      {/* Specific Class Context */}
      {isClassPage && (
        <>
          <div className="h-3 w-px bg-border mx-1 shrink-0" />
          <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{currentClass.grade}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground/80">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-primary">{currentClass.subject}</span>
            </div>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-black border-primary/20 text-primary">
              {currentClass.className}
            </Badge>
          </div>
        </>
      )}

      {/* Location Breadcrumb for other pages */}
      {!isClassPage && location.pathname !== '/' && (
          <>
            <div className="h-3 w-px bg-border mx-1 shrink-0" />
            <span className="text-muted-foreground/60 font-medium lowercase italic">
                {location.pathname.split('/').filter(Boolean).join(' / ')}
            </span>
          </>
      )}
    </div>
  );
};