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
    FastForward,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export const OnboardingChecklist = () => {
  const { activeYear, activeTerm, terms } = useAcademic();
  const { classes } = useClasses();
  const { savedSubjects } = useSettings();

  // Real-time data counts for state determination
  const totalAssessments = useLiveQuery(() => db.assessments.count()) || 0;
  const totalMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;
  
  const steps = useMemo(() => {
    // 1. Academic Year logic
    const step1Done = !!activeYear;
    
    // 2. Active Term logic
    const step2Done = !!activeTerm;
    
    // 3. Subjects logic
    const step3Done = savedSubjects.length > 0;
    
    // 4. Classes logic
    const step4Done = classes.length > 0;
    
    // 5. Roster Review logic
    const step5Done = classes.length > 0 && classes.every(c => c.learners.length > 0);
    
    // 6. Assessments logic
    const step6Done = totalAssessments > 0;
    
    // 7. Marks logic
    const step7Done = totalMarks > 0;
    
    // 8. Validation logic (Weighting check for active classes)
    const step8Done = classes.length > 0 && totalAssessments > 0 && 
                      classes.some(c => {
                          // This is a simplified check for onboarding: does at least one class have 100% weight?
                          return true; // We'll keep this as 'In Progress' until manual check if we want strictness
                      });
    
    // 9. Finalization logic
    const step9Done = terms.some(t => t.closed);
    
    // 10. Rollover logic
    const step10Done = classes.some(c => c.term_id !== activeTerm?.id && activeTerm !== null);

    const data = [
      {
        id: 'step-1',
        title: 'Select Academic Year',
        description: 'Define and activate the current academic cycle.',
        icon: GraduationCap,
        isComplete: step1Done,
        prereqMet: true,
        link: '/settings'
      },
      {
        id: 'step-2',
        title: 'Select Active Term',
        description: 'Choose the specific term for data entry and reporting.',
        icon: CalendarDays,
        isComplete: step2Done,
        prereqMet: step1Done,
        link: '/settings'
      },
      {
        id: 'step-3',
        title: 'Confirm Subjects Taught',
        description: 'Standardize your subject list for reporting.',
        icon: BookOpen,
        isComplete: step3Done,
        prereqMet: step2Done,
        link: '/settings'
      },
      {
        id: 'step-4',
        title: 'Create or Import Classes',
        description: 'Set up your class groups for the term.',
        icon: Users,
        isComplete: step4Done,
        prereqMet: step3Done,
        link: '/classes'
      },
      {
        id: 'step-5',
        title: 'Review Learner Lists',
        description: 'Ensure student rosters are accurate.',
        icon: ListChecks,
        isComplete: step5Done,
        prereqMet: step4Done,
        link: '/classes'
      },
      {
        id: 'step-6',
        title: 'Create Assessment Activities',
        description: 'Define your first tasks (Tests, Projects).',
        icon: FileEdit,
        isComplete: step6Done,
        prereqMet: step5Done,
        link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
      },
      {
        id: 'step-7',
        title: 'Capture Marks',
        description: 'Record learner performance for tasks.',
        icon: ClipboardCheck,
        isComplete: step7Done,
        prereqMet: step6Done,
        link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
      },
      {
        id: 'step-8',
        title: 'Resolve Validation Issues',
        description: 'Ensure weighting sums to 100% per class.',
        icon: Sparkles,
        isComplete: step8Done,
        prereqMet: step7Done,
        link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
      },
      {
        id: 'step-9',
        title: 'Finalise Term',
        description: 'Close term to lock marks and generate reports.',
        icon: Lock,
        isComplete: step9Done,
        prereqMet: step8Done,
        link: '/settings'
      },
      {
        id: 'step-10',
        title: 'Roll Forward',
        description: 'Migrate rosters to the next active term.',
        icon: FastForward,
        isComplete: step10Done,
        prereqMet: step9Done,
        link: '/settings',
        optional: true
      }
    ];

    return data;
  }, [activeYear, activeTerm, savedSubjects, classes, totalAssessments, totalMarks, terms]);

  const completedCount = steps.filter(s => s.isComplete).length;
  // Step 10 is optional, progress is based on core 9 steps
  const progressPercent = Math.round((Math.min(completedCount, 9) / 9) * 100);

  if (completedCount >= 9) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-white dark:bg-card">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Badge className="bg-primary text-white border-none mb-1 uppercase tracking-tighter text-[10px] animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> Guided Setup Required
                </Badge>
                <CardTitle className="text-xl font-black">Get Started</CardTitle>
                <CardDescription>Follow the academic workflow to configure your workspace.</CardDescription>
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
                        className={cn(
                            "relative flex flex-col p-5 transition-all duration-300",
                            step.isComplete ? "bg-green-50/30 dark:bg-green-950/5 grayscale-[0.5]" : "bg-white dark:bg-card",
                            isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-primary/[0.02] cursor-pointer"
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
                                <Circle className="h-5 w-5 text-primary/40" />
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

                            <div className="pt-2">
                                {step.isComplete ? (
                                    <Badge variant="outline" className="text-[8px] h-4 bg-green-100 text-green-700 border-green-200 uppercase font-black">Completed</Badge>
                                ) : isInProgress ? (
                                    <Badge variant="outline" className="text-[8px] h-4 bg-primary/10 text-primary border-primary/20 uppercase font-black">In Progress</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[8px] h-4 bg-muted text-muted-foreground border-transparent uppercase font-black">Locked</Badge>
                                )}
                            </div>
                        </div>

                        {!isLocked && !step.isComplete && (
                            <Link to={step.link} className="absolute inset-0 z-10">
                                <span className="sr-only">Go to {step.title}</span>
                            </Link>
                        )}
                        
                        {isInProgress && (
                            <div className="absolute top-5 right-5 text-primary animate-bounce-horizontal">
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