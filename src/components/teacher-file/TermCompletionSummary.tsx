"use client";

import React from 'react';
import { useTeacherFileCompletion, CompletionStep } from '@/hooks/useTeacherFileCompletion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    CheckCircle2, 
    Circle, 
    AlertCircle, 
    ArrowRight, 
    Loader2, 
    Lock,
    ShieldCheck,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TermCompletionSummaryProps {
  termId: string;
  yearId: string;
  termName: string;
  isFinalised?: boolean;
}

export const TermCompletionSummary = ({ termId, yearId, termName, isFinalised }: TermCompletionSummaryProps) => {
  const { stats, loading } = useTeacherFileCompletion(termId, yearId);
  const navigate = useNavigate();

  if (loading) return <Loader2 className="h-4 w-4 animate-spin opacity-20" />;
  if (!stats) return null;

  return (
    <div className="p-6 rounded-2xl border bg-slate-50/50 space-y-6 group hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">{termName}</h3>
                {isFinalised && <Badge className="bg-green-600 border-none text-[8px] h-4 uppercase font-black">LOCKED</Badge>}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Portfolio Status</p>
        </div>
        <div className="text-right">
            <span className={cn(
                "text-2xl font-black",
                stats.percent === 100 ? "text-green-600" : "text-blue-600"
            )}>
                {stats.percent}%
            </span>
            <p className="text-[8px] font-black text-slate-400 uppercase">Complete</p>
        </div>
      </div>

      <Progress value={stats.percent} className="h-1.5 bg-slate-200" />

      <div className="space-y-2">
          {stats.steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between group/step">
                  <div className="flex items-center gap-2">
                      {step.isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : step.type === 'required' ? (
                          <Circle className="h-3.5 w-3.5 text-slate-300" />
                      ) : (
                          <Star className="h-3.5 w-3.5 text-blue-200" />
                      )}
                      <span className={cn(
                          "text-xs font-medium transition-colors",
                          step.isComplete ? "text-slate-500" : "text-slate-800",
                          !step.isComplete && step.type === 'required' && "font-bold"
                      )}>
                          {step.label}
                      </span>
                  </div>
                  {!step.isComplete && !isFinalised && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(step.link)}
                        className="h-6 px-2 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 opacity-0 group-hover/step:opacity-100 transition-opacity"
                      >
                          Complete <ArrowRight className="ml-1 h-2.5 w-2.5" />
                      </Button>
                  )}
                  {step.type === 'recommended' && step.isComplete && (
                      <Badge variant="outline" className="text-[8px] h-4 border-blue-100 text-blue-600 bg-blue-50/50">Audit Ready</Badge>
                  )}
              </div>
          ))}
      </div>

      {stats.isReady ? (
          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-green-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Term Portfolio Validated for Moderation</span>
          </div>
      ) : (
          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Awaiting required administrative data</span>
          </div>
      )}
    </div>
  );
};