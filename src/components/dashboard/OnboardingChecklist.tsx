"use client";

import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, Sparkles, ClipboardCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const OnboardingChecklist = () => {
  const { coreSteps, isReadyForFinalization, progress, isLoading } = useSetupStatus();
  const navigate = useNavigate();

  if (isLoading) return null;

  const handleStepClick = (id: number) => {
    switch (id) {
      case 1:
      case 2:
        navigate('/settings', { state: { highlightId: 'year-selector', fromOnboarding: true } });
        break;
      case 3:
        navigate('/classes', { state: { highlightId: 'create-class-btn', fromOnboarding: true } });
        break;
      case 4:
        navigate('/classes', { state: { highlightId: 'class-list-roster', fromOnboarding: true } });
        break;
      case 5:
        navigate('/classes', { state: { highlightId: 'new-task-btn', fromOnboarding: true } });
        break;
      case 6:
        navigate('/classes', { state: { highlightId: 'mark-sheet-grid', fromOnboarding: true } });
        break;
      case 7:
        navigate('/classes', { state: { highlightId: 'mark-sheet-grid', fromOnboarding: true } });
        break;
      case 8:
        navigate('/settings', { state: { highlightId: 'finalize-term-btn', fromOnboarding: true } });
        break;
      default:
        navigate('/settings');
    }
  };

  return (
    <Card className={cn(
        "border-primary/20 shadow-sm overflow-hidden transition-all duration-500",
        isReadyForFinalization ? "bg-green-50/30 border-green-200" : "bg-primary/[0.02]"
    )}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        isReadyForFinalization ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                    )}>
                        {isReadyForFinalization ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                    </div>
                    <CardTitle className="text-base font-bold">
                        {isReadyForFinalization ? "Setup Complete" : "Academic Setup Checklist"}
                    </CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                    {isReadyForFinalization 
                        ? "You have successfully initialized your workspace for the current academic cycle." 
                        : "Complete these steps to unlock full class reporting and AI performance insights."}
                </CardDescription>
            </div>
            
            <div className="w-full md:w-48 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Year Progress</span>
                    <span className={isReadyForFinalization ? "text-green-700" : "text-primary"}>{progress}%</span>
                </div>
                <Progress value={progress} className={cn("h-1.5", isReadyForFinalization ? "bg-green-100" : "bg-muted")} />
            </div>
        </div>
      </CardHeader>
      
      {!isReadyForFinalization && (
        <CardContent className="pb-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {coreSteps.map((step) => (
                <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-300 group",
                    step.done 
                    ? "bg-green-50/50 border-green-100 opacity-80" 
                    : "bg-white dark:bg-card border-border hover:border-primary/40 hover:shadow-md"
                )}
                >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                        "flex-shrink-0 transition-colors",
                        step.done ? "text-green-600" : "text-muted-foreground group-hover:text-primary"
                    )}>
                    {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <span className={cn(
                        "text-[11px] font-bold truncate transition-colors",
                        step.done ? "text-green-800 line-through opacity-50" : "text-foreground group-hover:text-primary"
                    )}>
                    {step.title}
                    </span>
                </div>
                {!step.done && <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />}
                </button>
            ))}
            </div>
        </CardContent>
      )}

      {isReadyForFinalization && (
          <div className="px-6 pb-4 flex items-center gap-2 text-[11px] font-bold text-green-700 animate-in fade-in slide-in-from-top-1 duration-700">
              <PartyPopper className="h-3.5 w-3.5" />
              <span>Workspace is optimized for the current academic cycle.</span>
          </div>
      )}
    </Card>
  );
};