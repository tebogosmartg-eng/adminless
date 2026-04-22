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
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const ContextBar = () => {
  const { activeYear, activeTerm, assessments, marks: allMarks } = useAcademic();
  const { classes } = useClasses();

  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const currentClass = classId
    ? classes.find((c) => c.id === classId)
    : null;

  const isClassPage =
    location.pathname.includes("/classes/") && currentClass;

  const isGuided = location.state?.fromOnboarding;

  const today = format(new Date(), "yyyy-MM-dd");

  // ✅ NEW: Supabase attendance pulse
  const [attendancePulse, setAttendancePulse] = useState<{
    marked: boolean;
    present: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!classId || !activeTerm?.id) return;

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", activeTerm.id)
        .eq("date", today);

      if (error) {
        console.error("❌ Attendance fetch error:", error);
        return;
      }

      const present =
        data?.filter(
          (r) => r.status === "present" || r.status === "late"
        ).length || 0;

      setAttendancePulse({
        marked: (data?.length || 0) > 0,
        present,
        total: currentClass?.learners?.length || 0,
      });
    };

    fetchAttendance();
  }, [classId, activeTerm?.id, today, currentClass]);

  // ✅ Marking debt
  const markingDebt = useMemo(() => {
    if (!isClassPage || assessments.length === 0 || !currentClass) return 0;

    const totalExpected =
      assessments.length * currentClass.learners.length;

    const recordedCount = allMarks.filter(
      (m) => m.score !== null
    ).length;

    return totalExpected - recordedCount;
  }, [isClassPage, assessments, allMarks, currentClass]);

  if (!activeYear && !activeTerm && !isClassPage && !isGuided)
    return null;

  const otherClasses = classes.filter(
    (c) => c.id !== classId && !c.archived
  );

  return (
    <div
      className={cn(
        "border-b px-4 md:px-8 h-auto min-h-10 py-2 flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-wider z-20 sticky top-0 md:relative overflow-hidden no-print transition-all duration-500 gap-y-2",
        isGuided
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border"
      )}
    >
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {isGuided ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-3 w-3 animate-pulse" />
              <span>Setup Mode Active</span>
            </div>

            <div className="h-3 w-px bg-white/20" />

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[9px] font-black uppercase text-white"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-3 w-3" />
              Finish & Return
            </Button>
          </div>
        ) : (
          <>
            {/* Year + Term */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{activeYear?.name || "Year"}</span>
              </div>

              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />

              <Badge className="text-[9px]">
                {activeTerm?.name || "Term"}
              </Badge>
            </div>

            {/* Class */}
            {isClassPage && (
              <>
                <div className="h-3 w-px bg-border mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1">
                      <Badge>{currentClass?.className}</Badge>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    {otherClasses.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() =>
                          navigate(`/classes/${c.id}`)
                        }
                      >
                        {c.className}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Alerts */}
                <div className="flex items-center gap-2 ml-2">
                  {attendancePulse &&
                    !attendancePulse.marked &&
                    !activeTerm?.closed && (
                      <Link
                        to={`/classes/${classId}`}
                        className="text-red-600"
                      >
                        Register Pending
                      </Link>
                    )}

                  {markingDebt > 0 &&
                    !activeTerm?.closed && (
                      <div className="text-amber-600">
                        {markingDebt} missing entries
                      </div>
                    )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          <span>Cloud Active</span>
        </div>
      </div>
    </div>
  );
};