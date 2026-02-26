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
    <Card className="border-2 border-primary/20 bg-primary/[0.01]">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Moderation Readiness Audit</CardTitle>
                </div>
                <CardDescription className="text-xs">Formal requirements for the Digital Teacher File.</CardDescription>
            </div>
            <Badge variant={stats.isReady ? "default" : "outline"} className={cn(
                "h-6 px-3 uppercase font-black text-[10px]",
                stats.isReady && "bg-green-600 border-none"
            )}>
                {stats.isReady ? "Validated for Audit" : "Awaiting Data"}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
            {stats.steps.map((step: any) => (
                <div 
                    key={step.id} 
                    className={cn(
                        "flex items-center gap-4 p-3 rounded-xl border transition-all",
                        step.isComplete ? "bg-white border-green-100" : "bg-muted/30 border-transparent opacity-60"
                    )}
                >
                    <Checkbox checked={step.isComplete} disabled className="h-5 w-5 border-2" />
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm font-bold truncate",
                            step.isComplete ? "text-slate-900" : "text-slate-400"
                        )}>
                            {step.label}
                        </p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                            {step.type === 'required' ? "Mandatory Record" : "Recommended Evidence"}
                        </p>
                    </div>
                    {step.isComplete ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200 h-5 text-[9px] uppercase">Verified</Badge>
                    ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    )}
                </div>
            ))}
        </div>

        {!stats.isReady && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900 uppercase">Moderation Barrier Detected</p>
                    <p className="text-[10px] text-amber-800 leading-tight">
                        One or more mandatory sections are currently empty. A professional audit requires proof of planning and assessment before marks can be finalised.
                    </p>
                </div>
            </div>
        )}

        <div className="pt-4 border-t flex items-center gap-3">
            <Info className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
                Data is automatically validated against DBE curriculum and assessment norms.
            </p>
        </div>
      </CardContent>
    </Card>
  );
};