"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  Target,
  Trophy,
  Sparkles,
  CheckCircle2
} from "lucide-react";

import { format } from "date-fns";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

export const DailyGoalWidget = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      // 🔥 Active classes
      const { data: classes } = await supabase
        .from("classes")
        .select("*")
        .eq("archived", false);

      // 🔥 Attendance today
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);

      const markedClassIds = new Set(
        (attendance || []).map((r: any) => r.class_id)
      );

      const classesCompleted =
        (classes || []).filter((c: any) =>
          markedClassIds.has(c.id)
        ).length;

      const classesTotal = classes?.length || 0;

      // 🔥 TODOS (if you still use them)
      const { data: todos } = await supabase
        .from("todos")
        .select("*");

      const todosCompleted =
        (todos || []).filter((t: any) => t.completed).length;

      const todosTotal = todos?.length || 0;

      const totalSteps = classesTotal + todosTotal;
      const completedSteps = classesCompleted + todosCompleted;

      const percent =
        totalSteps > 0
          ? Math.round((completedSteps / totalSteps) * 100)
          : 0;

      setStats({
        percent,
        classesCompleted,
        classesTotal,
        todosCompleted,
        todosTotal,
        isDone: percent === 100 && totalSteps > 0
      });
    };

    fetchStats();
  }, [today]);

  // 🎉 Confetti
  useEffect(() => {
    if (stats?.isDone) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563eb", "#16a34a", "#fbbf24"]
      });
    }
  }, [stats?.isDone]);

  if (!stats || (stats.classesTotal === 0 && stats.todosTotal === 0))
    return null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-500",
        stats.isDone
          ? "bg-green-600 text-white border-none shadow-lg scale-[1.01]"
          : "bg-card border-dashed border-border"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "p-1 rounded-md",
                stats.isDone ? "bg-white/20" : "bg-primary/10"
              )}
            >
              {stats.isDone ? (
                <Trophy className="h-3.5 w-3.5" />
              ) : (
                <Target className="h-3.5 w-3.5 text-primary" />
              )}
            </div>

            <h4 className="font-black text-[10px] uppercase tracking-widest">
              {stats.isDone ? "Goal Achieved" : "Daily Goal"}
            </h4>
          </div>

          {stats.isDone && (
            <Sparkles className="h-3 w-3 animate-pulse" />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-black uppercase">
            <span
              className={
                stats.isDone ? "text-white/80" : "text-muted-foreground"
              }
            >
              {stats.classesCompleted}/{stats.classesTotal} Reg •{" "}
              {stats.todosCompleted}/{stats.todosTotal} Tasks
            </span>

            <span>{stats.percent}%</span>
          </div>

          <Progress
            value={stats.percent}
            className={cn(
              "h-1",
              stats.isDone ? "bg-white/20" : "bg-muted"
            )}
          />
        </div>

        {stats.isDone && (
          <p className="mt-2 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Administrative tasks complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
};