"use client";

import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronRight, Sparkles, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const OnboardingChecklist = () => {
  const { coreSteps, isReadyForFinalization, hasProfile } = useSetupStatus();
  const navigate = useNavigate();

  // STABILISATION MODE: Only render if a profile exists and setup is incomplete
  if (isReadyForFinalization || !hasProfile) return null;

  const handleStepClick = (id: number) => {
    switch (id) {
      case 1:
      case 2:
        navigate('/settings', { state: { highlightId: 'year-selector', fromOnboarding: true } });
        break;
      case 3:
        navigate('/settings', { state: { highlightId: 'subject-config', fromOnboarding: true } });
        break;
      case 4:
        navigate('/classes', { state: { highlightId: 'create-class-btn', fromOnboarding: true } });
        break;
      case 5:
        navigate('/classes', { state: { highlightId: 'class-list-roster', fromOnboarding: true } });
        break;
      case 6:
        // Navigate to the first class
        navigate('/classes', { state: { highlightId: 'new-task-btn', fromOnboarding: true } });
        break;
      case 7:
        navigate('/classes', { state: { highlightId: 'mark-sheet-grid', fromOnboarding: true } });
        break;
      case 8:
        navigate('/classes', { state: { highlightId: 'integrity-guard', fromOnboarding: true } });
        break;
      default:
        navigate('/settings');
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02] shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base font-bold">Professional Setup Guide</CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                    Complete these steps to unlock full reporting and AI insights.
                </CardDescription>
            </div>
            <Sparkles className="h-4 w-4 text-primary/40 animate-pulse" />
        </div>
      </CardHeader>
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
    </Card>
  );
};