"use client";

import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, ClipboardCheck, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const GetStartedChecklist = () => {
  const { coreSteps, isReadyForFinalization, progress, isLoading } = useSetupStatus();
  const navigate = useNavigate();

  if (isLoading) return null;

  // Hide the checklist once the term is finalised
  if (isReadyForFinalization) return null;

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
        navigate('/classes', { state: { highlightId: 'integrity-guard', fromOnboarding: true } });
        break;
      case 9:
        navigate('/settings', { state: { highlightId: 'finalize-term-btn', fromOnboarding: true } });
        break;
      default:
        navigate('/settings');
    }
  };

  return (
    <Card className={cn(
        "border-primary/20 shadow-lg overflow-hidden transition-all duration-500 mb-6",
        progress === 0 ? "bg-primary/5 ring-2 ring-primary/20" : "bg-primary/[0.02]"
    )}>
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-md">
                        <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black tracking-tight">
                            Get Started
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-primary/70">
                            Professional Onboarding
                        </CardDescription>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-md pt-2">
                    Welcome to AdminLess! Follow these steps to set up your digital classroom and prepare for term-end reporting.
                </p>
            </div>
            
            <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-primary">
                    <span>Setup Progress</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-primary/10" />
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-6 px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {coreSteps.map((step) => (
              <button
              key={step.id}
              onClick={() => !step.done && handleStepClick(step.id)}
              disabled={step.done}
              className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 group",
                  step.done 
                  ? "bg-green-50/30 border-green-100 opacity-60 cursor-default" 
                  : "bg-white dark:bg-card border-border hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
              )}
              >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "flex-shrink-0 transition-colors",
                        step.done ? "text-green-600" : "text-muted-foreground group-hover:text-primary"
                    )}>
                    {step.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                        "text-xs font-bold truncate transition-colors",
                        step.done ? "text-green-800 line-through" : "text-foreground group-hover:text-primary"
                    )}>
                    {step.title}
                    </span>
                </div>
                {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />}
              </button>
          ))}
          </div>
      </CardContent>
    </Card>
  );
};