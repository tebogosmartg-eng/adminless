"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    CheckCircle2, 
    Circle, 
    ArrowRight, 
    Sparkles, 
    GraduationCap, 
    Users, 
    FileEdit, 
    Lock,
    BookOpen,
    CalendarDays,
    ListChecks,
    ClipboardCheck,
    FastForward,
    Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LAST_STEP_KEY = 'adminless_setup_last_step';

export const OnboardingChecklist = () => {
  const { activeYear, activeTerm, terms } = useAcademic();
  const { classes } = useClasses();
  const { savedSubjects } = useSettings();
  const navigate = useNavigate();

  const totalAssessments = useLiveQuery(() => db.assessments.count()) || 0;
  const totalMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;
  
  const [lastStepId, setLastStepId] = useState<string | null>(() => localStorage.getItem(LAST_STEP_KEY));

  const steps = useMemo(() => {
    const step1Done = !!activeYear;
    const step2Done = !!activeTerm;
    const step3Done = savedSubjects.length > 0;
    const step4Done = classes.length > 0;
    const step5Done = classes.length > 0 && classes.every(c => c.learners.length > 0);
    const step6Done = totalAssessments > 0;
    const step7Done = totalMarks > 0;
    const step8Done = classes.length > 0 && totalAssessments > 0 && classes.some(c => totalMarks > 0); 
    const step9Done = terms.some(t => t.closed);
    const step10Done = classes.some(c => c.term_id !== activeTerm?.id && activeTerm !== null);

    const firstClassId = classes[0]?.id;

    return [
      {
        id: 'step-1',
        title: 'Select Academic Year',
        description: 'Define and activate the current academic cycle.',
        icon: GraduationCap,
        isComplete: step1Done,
        prereqMet: true,
        target: '/settings',
        highlightId: 'year-selector'
      },
      {
        id: 'step-2',
        title: 'Select Active Term',
        description: 'Choose the specific term for data entry.',
        icon: CalendarDays,
        isComplete: step2Done,
        prereqMet: step1Done,
        target: '/settings',
        highlightId: 'term-config'
      },
      {
        id: 'step-3',
        title: 'Confirm Subjects Taught',
        description: 'Standardize your subject list.',
        icon: BookOpen,
        isComplete: step3Done,
        prereqMet: step2Done,
        target: '/settings',
        highlightId: 'subject-config'
      },
      {
        id: 'step-4',
        title: 'Create or Import Classes',
        description: 'Set up your class groups for the term.',
        icon: Users,
        isComplete: step4Done,
        prereqMet: step3Done,
        target: '/classes',
        highlightId: 'create-class-btn'
      },
      {
        id: 'step-5',
        title: 'Review Learner Lists',
        description: 'Ensure student rosters are accurate.',
        icon: ListChecks,
        isComplete: step5Done,
        prereqMet: step4Done,
        target: '/classes',
        highlightId: 'class-list-roster'
      },
      {
        id: 'step-6',
        title: 'Create Assessment Activities',
        description: 'Define your first tasks (Tests, Projects).',
        icon: FileEdit,
        isComplete: step6Done,
        prereqMet: step5Done,
        target: firstClassId ? `/classes/${firstClassId}` : '/classes',
        highlightId: 'new-task-btn'
      },
      {
        id: 'step-7',
        title: 'Capture Marks',
        description: 'Record learner performance for tasks.',
        icon: ClipboardCheck,
        isComplete: step7Done,
        prereqMet: step6Done,
        target: firstClassId ? `/classes/${firstClassId}` : '/classes',
        highlightId: 'mark-sheet-grid'
      },
      {
        id: 'step-8',
        title: 'Resolve Validation Issues',
        description: 'Ensure weighting sums to 100%.',
        icon: Sparkles,
        isComplete: step8Done,
        prereqMet: step7Done,
        target: firstClassId ? `/classes/${firstClassId}` : '/classes',
        highlightId: 'integrity-guard'
      },
      {
        id: 'step-9',
        title: 'Finalise Term',
        description: 'Close term to lock marks.',
        icon: Lock,
        isComplete: step9Done,
        prereqMet: step8Done,
        target: '/settings',
        highlightId: 'finalize-term-btn'
      },
      {
        id: 'step-10',
        title: 'Roll Forward',
        description: 'Migrate rosters to the next term.',
        icon: FastForward,
        isComplete: step10Done,
        prereqMet: step9Done,
        target: '/settings',
        highlightId: 'roll-forward-btn',
        optional: true
      }
    ];
  }, [activeYear, activeTerm, savedSubjects, classes, totalAssessments, totalMarks, terms]);

  const completedCount = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((Math.min(completedCount, 9) / 9) * 100);

  // Auto-set the lastStepId if none exists to the first incomplete step
  useEffect(() => {
      if (!lastStepId) {
          const firstIncomplete = steps.find(s => !s.isComplete && s.prereqMet);
          if (firstIncomplete) setLastStepId(firstIncomplete.id);
      }
  }, [steps, lastStepId]);

  const handleStepClick = (step: any) => {
    if (!step.prereqMet && !step.isComplete) return;
    
    // Persist progress
    localStorage.setItem(LAST_STEP_KEY, step.id);
    setLastStepId(step.id);

    navigate(step.target, { 
      state: { 
        highlightId: step.highlightId,
        fromOnboarding: true 
      } 
    });
  };

  const handleResume = () => {
      const stepToResume = steps.find(s => s.id === lastStepId) || steps.find(s => !s.isComplete && s.prereqMet);
      if (stepToResume) handleStepClick(stepToResume);
  };

  if (completedCount >= 9) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-white dark:bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary text-white border-none uppercase tracking-tighter text-[10px]">
                        <Sparkles className="h-3 w-3 mr-1 inline" /> setup in progress
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">• Auto-saving progress</span>
                </div>
                <CardTitle className="text-xl font-black">Academic Setup Guide</CardTitle>
                <CardDescription className="text-primary font-medium">
                    Complete these steps to ensure your term data is compliant and ready for reporting.
                </CardDescription>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <span className="text-3xl font-black text-primary tabular-nums">{progressPercent}%</span>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completed</p>
                </div>
                <Button onClick={handleResume} className="gap-2 shadow-md bg-primary hover:bg-primary/90 px-6">
                    <Play className="h-4 w-4 fill-current" /> Resume Setup
                </Button>
            </div>
        </div>
        <Progress value={progressPercent} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-x divide-y border-b">
            {steps.map((step, idx) => {
                const isLocked = !step.prereqMet && !step.isComplete;
                const isInProgress = step.prereqMet && !step.isComplete;
                const isFocused = step.id === lastStepId;
                
                return (
                    <div 
                        key={step.id} 
                        onClick={() => handleStepClick(step)}
                        className={cn(
                            "relative flex flex-col p-5 transition-all duration-300",
                            step.isComplete ? "bg-green-50/30 dark:bg-green-950/5 grayscale-[0.5]" : "bg-white dark:bg-card",
                            isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-primary/[0.02] cursor-pointer group",
                            isFocused && !step.isComplete && "ring-2 ring-inset ring-primary/40 bg-primary/[0.01]"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                step.isComplete ? "bg-green-100 text-green-700" : 
                                isInProgress ? "bg-primary text-white shadow-md animate-pulse-slow" : "bg-muted text-muted-foreground"
                            )}>
                                <step.icon className="h-5 w-5" />
                            </div>
                            
                            {step.isComplete ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in" />
                            ) : isLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground/30" />
                            ) : (
                                <Circle className={cn(
                                    "h-5 w-5 transition-colors",
                                    isFocused ? "text-primary scale-110" : "text-primary/40 group-hover:text-primary"
                                )} />
                            )}
                        </div>
                        
                        <div className="space-y-1.5 mt-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-muted-foreground opacity-50">{idx + 1}</span>
                                <h4 className={cn(
                                    "text-xs font-bold leading-tight uppercase tracking-tight",
                                    step.isComplete ? "text-green-900 dark:text-green-400 line-through opacity-70" : 
                                    isLocked ? "text-muted-foreground" : "text-foreground"
                                )}>
                                    {step.title}
                                </h4>
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                {isLocked ? "Prerequisite: Finish previous step." : step.description}
                            </p>
                        </div>

                        {isInProgress && (
                            <div className="absolute top-5 right-5 text-primary animate-bounce-horizontal opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        )}

                        {isFocused && !step.isComplete && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/40" />
                        )}
                    </div>
                );
            })}
        </div>
      </CardContent>
    </Card>
  );
};