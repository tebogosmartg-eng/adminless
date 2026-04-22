"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription
} from "@/components/ui/card";

import {
  CalendarCheck,
  ArrowRight,
  ShieldAlert,
  ClipboardCheck,
  FileEdit
} from "lucide-react";

import { useClasses } from "@/context/ClassesContext";
import { useAcademic } from "@/context/AcademicContext";
import { usePendingAttendance } from "@/hooks/usePendingAttendance";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const AdminDebtWidget = () => {
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();
  const { pendingClasses } = usePendingAttendance(classes);

  const [missingMarksInfo, setMissingMarksInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH FROM SUPABASE
  useEffect(() => {
    const fetchDebt = async () => {
      if (!activeTerm) return;

      setLoading(true);

      const activeClasses = classes.filter(c => !c.archived);
      const classIds = activeClasses.map(c => c.id);

      // Get assessments
      const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("term_id", activeTerm.id)
        .in("class_id", Array.isArray(classIds) ? classIds : [classIds]);

      if (!assessments) {
        setMissingMarksInfo([]);
        setLoading(false);
        return;
      }

      const debts: any[] = [];

      for (const ass of assessments) {
        const cls = activeClasses.find(c => c.id === ass.class_id);
        if (!cls) continue;

        const { data: marks } = await supabase
          .from("assessment_marks")
          .select("*")
          .eq("assessment_id", ass.id);

        const recorded = (marks || []).filter(m => m.score !== null).length;
        const missing = cls.learners.length - recorded;

        if (missing > 0) {
          debts.push({
            classId: cls.id,
            className: cls.className,
            title: ass.title,
            count: missing
          });
        }
      }

      setMissingMarksInfo(debts);
      setLoading(false);
    };

    fetchDebt();
  }, [activeTerm, classes]);

  const hasDebt =
    pendingClasses.length > 0 || missingMarksInfo.length > 0;

  if (!hasDebt && activeTerm) {
    return (
      <Card className="bg-green-50/20 border-green-100 shadow-sm border-2 border-dashed">
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-700">
            <ShieldAlert className="h-4 w-4" />
            Administrative Compliance
          </CardTitle>
          <CardDescription className="text-[11px]">
            Records are current for {activeTerm.name}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/20 shadow-sm">
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700">
          <ClipboardCheck className="h-4 w-4" />
          Pending Data Capture
        </CardTitle>
        <CardDescription className="text-[11px]">
          Outstanding tasks for {activeTerm?.name}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">

        {/* ATTENDANCE */}
        {pendingClasses.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-600">
              <CalendarCheck className="h-3 w-3" /> Registers
            </div>

            {pendingClasses.slice(0, 2).map(cls => (
              <div
                key={cls.id}
                className="flex items-center justify-between text-xs bg-background/50 p-1.5 px-2 rounded border gap-2"
              >
                <span className="truncate flex-1 font-semibold">
                  {cls.className}
                </span>

                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/classes/${cls.id}`}>
                    Mark <ArrowRight className="ml-1 h-2.5 w-2.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* MARKS */}
        {missingMarksInfo.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-600">
              <FileEdit className="h-3 w-3" /> Task Entries
            </div>

            {missingMarksInfo.slice(0, 2).map((debt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-background/50 p-1.5 px-2 rounded border gap-2"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold truncate">
                    {debt.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase">
                    {debt.className} • {debt.count} missing
                  </span>
                </div>

                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/classes/${debt.classId}`}>
                    Mark <ArrowRight className="ml-1 h-2.5 w-2.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
};