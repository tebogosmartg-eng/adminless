"use client";

import { useMemo } from 'react';
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
    FastForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export const OnboardingChecklist = () => {
  const { activeYear, activeTerm, terms } = useAcademic();
  const { classes } = useClasses();
  const { savedSubjects } = useSettings();
  const navigate = useNavigate();

  const totalAssessments = useLiveQuery(() => db.assessments.count()) || 0;
  const totalMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;
  const totalAttendance = useLiveQuery(() => db.attendance.count()) || 0;
  
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

  const feedbackMessage = useMemo(() => {
    if (progressPercent === 0) return "Let's get your classroom set up for success.";
    if (progressPercent <= 25) return "Great start! You're laying a solid foundation.";
    if (progressPercent <= 50) return "You're making great progress. Almost halfway there!";
    if (progressPercent <= 75) return "You’re ready to start marking. Just a few details left!";
    if (progressPercent < 100) return "Almost there — just one step left!";
    return "Your term is fully set up and compliant!";
  }, [progressPercent]);

  if (completedCount >= 9) return null;

  const handleStepClick = (step: any) => {
    if (!step.prereqMet && !step.isComplete) return;
    
    navigate(step.target, { 
      state: { 
        highlightId: step.highlightId,
        fromOnboarding: true 
      } 
    });
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-white dark:bg-card">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Badge className="bg-primary text-white border-none mb-1 uppercase tracking-tighter text-[10px] animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> Action Required
                </Badge>
                <CardTitle className="text-xl font-black">Get Started</CardTitle>
                <CardDescription className="text-primary font-medium animate-in fade-in slide-in-from-left-2 duration-700">
                    {feedbackMessage}
                </CardDescription>
            </div>
            <div className="text-right">
                <span className="text-3xl font-black text-primary">{progressPercent}%</span>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Workflow Progress</p>
            </div>
        </div>
        <Progress value={progressPercent} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-x divide-y border-b">
            {steps.map((step, idx) => {
                const isLocked = !step.prereqMet && !step.isComplete;
                const isInProgress = step.prereqMet && !step.isComplete;
                
                return (
                    <div 
                        key={step.id} 
                        onClick={() => handleStepClick(step)}
                        className={cn(
                            "relative flex flex-col p-5 transition-all duration-300",
                            step.isComplete ? "bg-green-50/30 dark:bg-green-950/5 grayscale-[0.5]" : "bg-white dark:bg-card",
                            isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-primary/[0.02] cursor-pointer group"
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
                                <Circle className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
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
                    </div>
                );
            })}
        </div>
      </CardContent>
    </Card>
  );
};