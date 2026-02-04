"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, Sparkles, GraduationCap, Users, CalendarCheck, FileEdit, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Link } from 'react-router-dom';

export const OnboardingChecklist = () => {
  const { years, assessments, terms } = useAcademic();
  const { classes } = useClasses();

  // Track attendance and marks existence
  const hasAttendance = useLiveQuery(() => db.attendance.count()) || 0;
  const hasMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;

  const steps = useMemo(() => [
    {
      id: 'year',
      title: 'Academic Setup',
      description: 'Create your first Academic Year and standard terms.',
      icon: GraduationCap,
      isComplete: years.length > 0,
      link: '/settings'
    },
    {
      id: 'class',
      title: 'Create a Class',
      description: 'Add your first class and import your student roster.',
      icon: Users,
      isComplete: classes.length > 0,
      link: '/classes'
    },
    {
      id: 'attendance',
      title: 'Track Attendance',
      description: 'Mark your first daily register to begin the audit trail.',
      icon: CalendarCheck,
      isComplete: hasAttendance > 0,
      link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
    },
    {
      id: 'assessment',
      title: 'Capture Marks',
      description: 'Create an assessment task and record student performance.',
      icon: FileEdit,
      isComplete: assessments.length > 0 && hasMarks > 0,
      link: classes.length > 0 ? `/classes/${classes[0]?.id}` : '/classes'
    },
    {
      id: 'finalize',
      title: 'Finalize Term',
      description: 'Lock your data for the term to generate professional reports.',
      icon: Lock,
      isComplete: terms.some(t => t.closed),
      link: '/settings'
    }
  ], [years, classes, hasAttendance, assessments, hasMarks, terms]);

  const completedCount = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Don't show if everything is finished
  if (completedCount === steps.length) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01] shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Badge className="bg-primary/10 text-primary border-none mb-1 hover:bg-primary/20 transition-colors cursor-default">
                    <Sparkles className="h-3 w-3 mr-1" /> Guided Onboarding
                </Badge>
                <CardTitle className="text-xl">Get Started with AdminLess</CardTitle>
                <CardDescription>Complete these steps to unlock the full potential of your digital classroom.</CardDescription>
            </div>
            <div className="text-right">
                <span className="text-2xl font-black text-primary">{progressPercent}%</span>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Setup Status</p>
            </div>
        </div>
        <Progress value={progressPercent} className="h-2 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, idx) => (
                <Link 
                    key={step.id} 
                    to={step.link}
                    className={cn(
                        "relative flex flex-col p-4 rounded-xl border transition-all duration-300 group",
                        step.isComplete 
                            ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900/50" 
                            : "bg-white dark:bg-card border-border hover:border-primary/50 hover:shadow-md"
                    )}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            step.isComplete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                            <step.icon className="h-5 w-5" />
                        </div>
                        {step.isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in" />
                        ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50" />
                        )}
                    </div>
                    
                    <div className="space-y-1 mt-auto">
                        <h4 className={cn(
                            "text-sm font-bold leading-tight",
                            step.isComplete ? "text-green-900 dark:text-green-400 line-through opacity-70" : "text-foreground"
                        )}>
                            {idx + 1}. {step.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                            {step.description}
                        </p>
                    </div>

                    {!step.isComplete && (
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                    )}
                </Link>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

import { Badge } from '@/components/ui/badge';