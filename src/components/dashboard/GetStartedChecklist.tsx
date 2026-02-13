"use client";

import { useState, useEffect } from "react";
import { useSetupStatus, StepStatus } from "@/hooks/useSetupStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
    CheckCircle2, 
    Circle, 
    Rocket, 
    Star, 
    Lock, 
    Timer, 
    ChevronDown, 
    ChevronUp,
    Sparkles,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";
import { Button } from "@/components/ui/button";
import { importDemoData } from "@/services/demoData";
import { useAcademic } from "@/context/AcademicContext";
import { showSuccess, showError } from "@/utils/toast";
import confetti from 'canvas-confetti';

export const GetStartedChecklist = () => {
  const { coreSteps, progress, isLoading } = useSetupStatus();
  const { classes } = useClasses();
  const { recalculateAllActiveAverages } = useAcademic();
  const navigate = useNavigate();
  
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('adminless_checklist_minimized') === 'true';
  });

  // Celebrate on 100% completion
  useEffect(() => {
    if (progress === 100) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#16a34a', '#fbbf24']
        });
    }
  }, [progress]);

  const toggleMinimized = () => {
    const nextState = !isMinimized;
    setIsMinimized(nextState);
    localStorage.setItem('adminless_checklist_minimized', String(nextState));
  };

  const handleLoadDemo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDemoLoading(true);
    try {
        const { yearId, activeTermId } = await importDemoData();
        localStorage.setItem('adminless_active_year_id', yearId);
        localStorage.setItem('adminless_active_term_id', activeTermId);
        await recalculateAllActiveAverages(true);
        showSuccess("Demo context initialized. Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
        showError("Demo load failed.");
    } finally {
        setIsDemoLoading(false);
    }
  };

  if (isLoading) return null;

  const getProgressMessage = () => {
    if (progress === 0) return "Welcome! Let's build your academic foundation.";
    if (progress <= 30) return "Foundation set. Now, let's organize your classes.";
    if (progress <= 60) return "Great work! You’re ready to start marking.";
    if (progress <= 80) return "Almost there — just a few steps left.";
    if (progress < 100) return "One final step to go!";
    return "Your term is fully set up and ready for audit.";
  };

  const handleStepClick = (id: number, isLocked: boolean, status: StepStatus) => {
    if (isLocked || status === 'completed') return;

    const firstClassId = classes.length > 0 ? classes[0].id : null;

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
        if (firstClassId) {
            navigate(`/classes/${firstClassId}`, { state: { fromOnboarding: true } });
        } else {
            navigate('/classes', { state: { highlightId: 'class-list-roster', fromOnboarding: true } });
        }
        break;
      case 6:
        if (firstClassId) {
            navigate(`/classes/${firstClassId}`, { state: { highlightId: 'new-task-btn', fromOnboarding: true } });
        } else {
            navigate('/classes');
        }
        break;
      case 7:
        if (firstClassId) {
            navigate(`/classes/${firstClassId}`, { state: { highlightId: 'mark-sheet-grid', fromOnboarding: true } });
        } else {
            navigate('/classes');
        }
        break;
      case 8:
        if (firstClassId) {
            navigate(`/classes/${firstClassId}`, { state: { highlightId: 'integrity-guard', fromOnboarding: true } });
        } else {
            navigate('/classes');
        }
        break;
      case 9:
        navigate('/settings', { state: { highlightId: 'finalize-term-btn', fromOnboarding: true } });
        break;
      case 10:
        navigate('/settings', { state: { highlightId: 'roll-forward-btn', fromOnboarding: true } });
        break;
      default:
        navigate('/settings');
    }
  };

  const getStepIcon = (status: StepStatus, isLocked: boolean) => {
    if (isLocked) return <Lock className="h-4 w-4 text-muted-foreground/40" />;
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'in-progress') return <Timer className="h-4 w-4 text-primary animate-pulse" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className={cn(
        "border-primary/20 shadow-lg overflow-hidden transition-all duration-500 mb-6",
        progress === 0 && !isMinimized ? "bg-primary/5 ring-2 ring-primary/20" : "bg-primary/[0.02]"
    )}>
      <CardHeader className={cn("px-6 transition-all", isMinimized ? "py-3" : "pb-4 pt-6")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center justify-between flex-1">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl shadow-md transition-all",
                        progress === 100 ? "bg-green-600 text-white" : "bg-primary text-primary-foreground",
                        isMinimized ? "scale-75" : ""
                    )}>
                        {progress === 100 ? <Star className="h-4 w-4 md:h-5 md:w-5" /> : <Rocket className="h-4 w-4 md:h-5 md:w-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className={cn("font-black tracking-tight transition-all", isMinimized ? "text-sm" : "text-xl")}>
                                Setup Workflow
                            </CardTitle>
                            {isMinimized && (
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] h-4">
                                    {progress}% Complete
                                </Badge>
                            )}
                        </div>
                        {!isMinimized && (
                            <CardDescription className={cn(
                                "text-sm font-bold transition-colors",
                                progress === 100 ? "text-green-600" : "text-primary/70"
                            )}>
                                {getProgressMessage()}
                            </CardDescription>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {progress === 0 && !isMinimized && (
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleLoadDemo} 
                            disabled={isDemoLoading}
                            className="h-8 gap-2 font-bold text-[10px] uppercase tracking-tighter"
                        >
                            {isDemoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Quick Start with Demo Data
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={toggleMinimized}>
                        {isMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
            
            <div className={cn("w-full md:w-64 space-y-2 transition-all", isMinimized && "md:w-48")}>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-primary">
                    <span className={cn(isMinimized && "hidden")}>Onboarding Progress</span>
                    <span className={cn(isMinimized && "hidden")}>{progress}%</span>
                </div>
                <Progress value={progress} className={cn("h-1.5 md:h-2 bg-primary/10", isMinimized && "h-1")} />
            </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pb-6 px-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {coreSteps.map((step) => (
                <button
                key={step.id}
                onClick={() => handleStepClick(step.id, step.isLocked, step.status)}
                className={cn(
                    "flex items-start justify-between p-4 rounded-2xl border text-left transition-all duration-300 group relative min-h-[100px]",
                    step.status === 'completed' 
                    ? "bg-green-50/30 border-green-100 opacity-60 cursor-default" 
                    : step.isLocked 
                    ? "bg-muted/10 border-transparent opacity-40 cursor-not-allowed"
                    : "bg-white dark:bg-card border-border hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
                )}
                >
                    <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                                {getStepIcon(step.status, step.isLocked)}
                            </div>
                            <span className={cn(
                                "text-[11px] font-bold truncate transition-colors",
                                step.status === 'completed' ? "text-green-800 line-through" : step.isLocked ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
                            )}>
                                {step.title}
                            </span>
                        </div>
                        <p className={cn(
                            "text-[10px] leading-tight line-clamp-3",
                            step.status === 'completed' ? "text-green-700/60" : "text-muted-foreground"
                        )}>
                            {step.description}
                        </p>
                        {step.optional && !step.isLocked && (
                            <span className="text-[8px] font-black uppercase text-blue-600 flex items-center gap-1 mt-1">
                                <Star className="h-2 w-2 fill-current" /> Recommended
                            </span>
                        )}
                    </div>
                </button>
            ))}
            </div>
        </CardContent>
      )}
    </Card>
  );
};

import { Badge } from "@/components/ui/badge";