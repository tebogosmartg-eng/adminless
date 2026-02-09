import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, FileEdit, CalendarCheck, ArrowRight, ShieldAlert, ClipboardCheck } from "lucide-react";
import { useClasses } from "@/context/ClassesContext";
import { useAcademic } from "@/context/AcademicContext";
import { usePendingAttendance } from "@/hooks/usePendingAttendance";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

export const AdminDebtWidget = () => {
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();
  const { pendingClasses } = usePendingAttendance(classes);

  // Find assessments with missing marks in current term
  const missingMarksInfo = useLiveQuery(async () => {
    if (!activeTerm) return [];
    
    const activeClasses = classes.filter(c => !c.archived);
    const classIds = activeClasses.map(c => c.id);
    
    const assessments = await db.assessments
      .where('term_id')
      .equals(activeTerm.id)
      .filter(a => classIds.includes(a.class_id))
      .toArray();

    const debts = [];

    for (const ass of assessments) {
        const cls = activeClasses.find(c => c.id === ass.class_id);
        if (!cls) continue;

        const marks = await db.assessment_marks
            .where('assessment_id')
            .equals(ass.id)
            .toArray();

        const missingCount = cls.learners.length - marks.filter(m => m.score !== null).length;
        
        if (missingCount > 0) {
            debts.push({
                classId: cls.id,
                className: cls.className,
                title: ass.title,
                count: missingCount
            });
        }
    }
    return debts;
  }, [activeTerm, classes]) || [];

  const hasDebt = pendingClasses.length > 0 || missingMarksInfo.length > 0;

  if (!hasDebt && activeTerm) {
    return (
        <Card className="bg-green-50/20 border-green-100 dark:bg-green-950/10 shadow-sm border-2 border-dashed">
            <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <ShieldAlert className="h-4 w-4" />
                    Administrative Compliance
                </CardTitle>
                <CardDescription className="text-[11px]">Records are current for {activeTerm.name}.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <ClipboardCheck className="h-4 w-4" />
          Pending Data Capture
        </CardTitle>
        <CardDescription className="text-[11px]">Outstanding tasks for {activeTerm?.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {pendingClasses.length > 0 && (
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-amber-600">
                    <CalendarCheck className="h-3 w-3" /> Registers
                </div>
                {pendingClasses.slice(0, 2).map(cls => (
                    <div key={cls.id} className="flex items-center justify-between text-xs bg-background/50 p-1.5 px-2 rounded border border-amber-100/50">
                        <span className="truncate max-w-[140px] font-semibold">{cls.className}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase hover:bg-amber-100" asChild>
                            <Link to={`/classes/${cls.id}`}>Open <ArrowRight className="ml-1 h-2.5 w-2.5" /></Link>
                        </Button>
                    </div>
                ))}
            </div>
        )}

        {missingMarksInfo.length > 0 && (
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-amber-600">
                    <FileEdit className="h-3 w-3" /> Task Entries
                </div>
                {missingMarksInfo.slice(0, 2).map((debt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-background/50 p-1.5 px-2 rounded border border-amber-100/50">
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold truncate max-w-[140px]">{debt.title}</span>
                            <span className="text-[9px] text-muted-foreground font-medium uppercase">{debt.className} • {debt.count} missing</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase hover:bg-amber-100" asChild>
                            <Link to={`/classes/${debt.classId}`}>Mark <ArrowRight className="ml-1 h-2.5 w-2.5" /></Link>
                        </Button>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
};