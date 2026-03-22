"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
    ClipboardCheck, 
    ShieldCheck, 
    AlertCircle,
    Info,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherFileCompletion } from '@/hooks/useTeacherFileCompletion';

interface ModerationChecklistProps {
  termId: string;
  yearId: string;
}

export const ModerationChecklist = ({ termId, yearId }: ModerationChecklistProps) => {
  const { stats, loading } = useTeacherFileCompletion(termId, yearId);

  if (loading || !stats) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] print:border-none print:bg-transparent print:shadow-none print-avoid-break">
      <CardHeader className="pb-3 print:px-0">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary no-print" />
                    <CardTitle className="text-lg print:text-black">Moderation Readiness Audit</CardTitle>
                </div>
                <CardDescription className="text-xs no-print">Formal requirements for the Digital Teacher File.</CardDescription>
                <p className="hidden print:block text-[10px] font-bold uppercase text-slate-500 tracking-widest mt-1">Official Compliance Record</p>
            </div>
            <div className="no-print">
                <Badge variant={stats.isReady ? "default" : "outline"} className={cn(
                    "h-6 px-3 uppercase font-black text-[10px]",
                    stats.isReady && "bg-green-600 border-none"
                )}>
                    {stats.isReady ? "Validated for Audit" : "Awaiting Data"}
                </Badge>
            </div>
            <div className="hidden print:block text-right">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Audit Status</p>
                <p className={cn("text-xs font-bold uppercase tracking-widest", stats.isReady ? "text-slate-800" : "text-slate-500")}>
                    {stats.isReady ? "Requirements Met" : "Incomplete"}
                </p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 print:px-0">
        <div className="grid gap-3 print:gap-0 print:border-t print:border-slate-300">
            {stats.steps.map((step: any) => (
                <div 
                    key={step.id} 
                    className={cn(
                        "flex items-center gap-4 p-3 rounded-xl border transition-all",
                        step.isComplete ? "bg-white border-green-100" : "bg-muted/30 border-transparent opacity-60",
                        "print:rounded-none print:border-0 print:border-b print:border-slate-200 print:bg-transparent print:p-2 print:opacity-100"
                    )}
                >
                    <Checkbox checked={step.isComplete} disabled className="h-5 w-5 border-2 no-print" />
                    
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm font-bold truncate",
                            step.isComplete ? "text-slate-900" : "text-slate-400",
                            "print:text-black print:text-xs"
                        )}>
                            {step.label}
                        </p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter print:text-[8px] print:text-slate-500">
                            {step.type === 'required' ? "Mandatory Record" : "Recommended Evidence"}
                        </p>
                    </div>
                    
                    <div className="no-print">
                        {step.isComplete ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200 h-5 text-[9px] uppercase">Verified</Badge>
                        ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        )}
                    </div>

                    <div className="hidden print:block text-right">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            step.isComplete ? "text-slate-800" : "text-slate-400"
                        )}>
                            {step.isComplete ? "[ Verified ]" : "[ Pending ]"}
                        </span>
                    </div>
                </div>
            ))}
        </div>

        {!stats.isReady && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3 print:bg-transparent print:border-slate-300 print:p-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 no-print" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900 uppercase print:text-black">Moderation Barrier Detected</p>
                    <p className="text-[10px] text-amber-800 leading-tight print:text-slate-700">
                        One or more mandatory sections are currently empty. A professional audit requires proof of planning and assessment before marks can be finalised.
                    </p>
                </div>
            </div>
        )}

        <div className="pt-4 border-t flex items-center gap-3 no-print">
            <Info className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
                Data is automatically validated against DBE curriculum and assessment norms.
            </p>
        </div>
      </CardContent>
    </Card>
  );
};