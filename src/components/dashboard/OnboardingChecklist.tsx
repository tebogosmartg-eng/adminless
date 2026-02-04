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
    CalendarCheck, 
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
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export const OnboardingChecklist = () => {
  const { years, activeYear, activeTerm, assessments, terms } = useAcademic();
  const { classes } = useClasses();
  const { savedSubjects } = useSettings();

  // Track marks existence
  const hasMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;

  const steps = useMemo(() => [
    {
      id: 'step-1',
      title: 'Select Academic Year',
      description: 'Define and activate the current academic cycle.',
      icon: GraduationCap,
      isComplete: !!activeYear,
      link: '/settings'
    },
    {
      id: 'step-2',
      title: 'Select Active Term',
      description: 'Choose the specific term for data entry and reporting.',
      icon: CalendarDays,
      isComplete: !!activeTerm,
      link: '/settings'
    },
    {
      id: 'step-3',
      title: 'Confirm Subjects Taught',
      description: 'Standardize your subject list for consistent reporting.',
      icon: BookOpen,
      isComplete: savedSubjects.length > 0,
      link: '/settings'
    },
    {
      id: 'step-4',
      title: 'Create or Import Classes',
      description: 'Set up your class groups for the selected term.',
      icon: Users,
      isComplete: classes.length > 0,
      link: '/classes'
    },
    {
      id: 'step-5',
      title: 'Review Learner Lists',
      description: 'Ensure student rosters are accurate for each class.',
      icon: ListChecks,
      isComplete: classes.some(c => c.learners.length > 0),
      link: '/classes'
    },
    {
      id: 'step-6',
      title: 'Create Assessment Activities',
      description: 'Define your first tasks (Tests, Projects, etc.)',
      icon: FileEdit,
      isComplete: assessments.length > 0,
      link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
    },
    {
      id: 'step-7',
      title: 'Capture Marks',
      description: 'Record learner performance for your assessments.',
      icon: ClipboardCheck,
      isComplete: hasMarks > 0,
      link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
    },
    {
      id: 'step-8',
      title: 'Resolve Validation Issues',
      description: 'Ensure weighting sums to 100% and marks are complete.',
      icon: Sparkles,
      // Simple heuristic: if we have assessments, do they equal 100%?
      isComplete: assessments.length > 0 && assessments.reduce((acc, a) => acc + (a.weight || 0), 0) === 100,
      link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
    },
    {
      id: 'step-9',
      title: 'Finalise Term',
      description: 'Close the term to lock marks and generate final reports.',
      icon: Lock,
      isComplete: terms.some(t => t.closed),
      link: '/settings'
    },
    {
      id: 'step-10',
      title: 'Roll Forward (Optional)',
      description: 'Migrate rosters to the next term to begin setup again.',
      icon: FastForward,
      // Complete if we have classes in more than one term
      isComplete: (new Set(classes.map(c => c.term_id))).size > 1,
      link: '/settings'
    }
  ], [activeYear, activeTerm, savedSubjects, classes, assessments, hasMarks, terms]);

  const completedCount = steps.filter(s => s.isComplete).length;
  // Step 10 is optional, so we calculate progress based on 9 steps
  const progressPercent = Math.round((Math.min(completedCount, 9) / 9) * 100);

  // Hide only if the core 9 steps are finished
  if (completedCount >= 9) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-white dark:bg-card">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Badge className="bg-primary text-white border-none mb-1 uppercase tracking-tighter text-[10px]">
                    Guided Setup
                </Badge>
                <CardTitle className="text-xl font-black">Get Started</CardTitle>
                <CardDescription>Follow these steps to complete your initial academic configuration.</CardDescription>
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
            {steps.map((step, idx) => (
                <Link 
                    key={step.id} 
                    to={step.link}
                    className={cn(
                        "relative flex flex-col p-5 transition-all duration-300 group",
                        step.isComplete 
                            ? "bg-green-50/30 dark:bg-green-950/5 grayscale-[0.5]" 
                            : "bg-white dark:bg-card hover:bg-primary/[0.02]"
                    )}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            step.isComplete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                        )}>
                            <step.icon className="h-5 w-5" />
                        </div>
                        {step.isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in" />
                        ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50" />
                        )}
                    </div>
                    
                    <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-muted-foreground opacity-50">{idx + 1}</span>
                             <h4 className={cn(
                                "text-xs font-bold leading-tight uppercase tracking-tight",
                                step.isComplete ? "text-green-900 dark:text-green-400 line-through opacity-70" : "text-foreground"
                            )}>
                                {step.title}
                            </h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                            {step.description}
                        </p>
                    </div>

                    {!step.isComplete && (
                        <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                    )}
                </Link>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};