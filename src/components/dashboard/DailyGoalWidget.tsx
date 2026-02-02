import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export const DailyGoalWidget = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const stats = useLiveQuery(async () => {
    // Goal: Mark attendance for all active classes + complete todos
    const activeClasses = await db.classes.filter(c => !c.archived).toArray();
    const attendanceRecords = await db.attendance.where('date').equals(today).toArray();
    const markedClassIds = new Set(attendanceRecords.map(r => r.class_id));
    
    const classesCompleted = activeClasses.filter(c => markedClassIds.has(c.id)).length;
    const classesTotal = activeClasses.length;

    const todos = await db.todos.toArray();
    const todosCompleted = todos.filter(t => t.completed).length;
    const todosTotal = todos.length;

    const totalSteps = (classesTotal > 0 ? classesTotal : 0) + (todosTotal > 0 ? todosTotal : 0);
    const completedSteps = classesCompleted + todosCompleted;
    
    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return { percent, classesCompleted, classesTotal, todosCompleted, todosTotal, isDone: percent === 100 && totalSteps > 0 };
  }, [today]);

  useEffect(() => {
    if (stats?.isDone) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#16a34a', '#fbbf24']
        });
    }
  }, [stats?.isDone]);

  if (!stats || (stats.classesTotal === 0 && stats.todosTotal === 0)) return null;

  return (
    <Card className={cn(
        "overflow-hidden transition-all duration-500",
        stats.isDone ? "bg-green-600 text-white border-none shadow-lg scale-[1.02]" : "bg-white dark:bg-card border-dashed"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-full", stats.isDone ? "bg-white/20" : "bg-primary/10")}>
                    {stats.isDone ? <Trophy className="h-4 w-4" /> : <Target className="h-4 w-4 text-primary" />}
                </div>
                <h4 className="font-bold text-xs uppercase tracking-widest">
                    {stats.isDone ? "Daily Goal Achieved!" : "Daily Progress"}
                </h4>
            </div>
            {stats.isDone && <Sparkles className="h-4 w-4 animate-pulse" />}
        </div>

        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
                <span className={stats.isDone ? "text-white/80" : "text-muted-foreground"}>
                    {stats.classesCompleted}/{stats.classesTotal} Registers • {stats.todosCompleted}/{stats.todosTotal} Tasks
                </span>
                <span>{stats.percent}%</span>
            </div>
            <Progress 
                value={stats.percent} 
                className={cn("h-1.5", stats.isDone ? "bg-white/20" : "bg-muted")} 
                // @ts-ignore
                indicatorClassName={stats.isDone ? "bg-white" : "bg-primary"}
            />
        </div>

        {stats.isDone && (
            <p className="mt-3 text-[11px] font-medium text-white/90 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                All administrative tasks completed for today.
            </p>
        )}
      </CardContent>
    </Card>
  );
};

import { cn } from '@/lib/utils';