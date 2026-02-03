import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, FileEdit, CalendarCheck, ArrowRight, ShieldAlert } from "lucide-react";
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

  if (!hasDebt) {
    return (
        <Card className="bg-green-50/30 border-green-100 dark:bg-green-950/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                    <ShieldAlert className="h-5 w-5" />
                    Admin Compliance
                </CardTitle>
                <CardDescription>Your records are currently 100% complete.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <AlertCircle className="h-5 w-5" />
          Administrative Debt
        </CardTitle>
        <CardDescription>Outstanding requirements for {activeTerm?.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {pendingClasses.length > 0 && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    <CalendarCheck className="h-3 w-3" /> Attendance Registers
                </div>
                {pendingClasses.slice(0, 2).map(cls => (
                    <div key={cls.id} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded border border-amber-100">
                        <span className="truncate max-w-[150px] font-medium">{cls.className}</span>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-amber-100" asChild>
                            <Link to={`/classes/${cls.id}`}>Mark <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </div>
                ))}
            </div>
        )}

        {missingMarksInfo.length > 0 && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    <FileEdit className="h-3 w-3" /> Missing Marks
                </div>
                {missingMarksInfo.slice(0, 2).map((debt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded border border-amber-100">
                        <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[150px]">{debt.title}</span>
                            <span className="text-[10px] text-muted-foreground">{debt.className} • {debt.count} empty</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-amber-100" asChild>
                            <Link to={`/classes/${debt.classId}`}>Capture <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
};