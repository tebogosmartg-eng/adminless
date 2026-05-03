"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";

import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  FileCheck
} from "lucide-react";

import { Link } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";

export const ModerationComplianceWidget = () => {
  const { classes } = useClasses();

  const [stats, setStats] = useState<{
    adequateRulePercent: number;
    classesWithSample: number;
    classesAdequateForRule: number;
    activeTotal: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const activeClasses = classes.filter(c => !c.archived);
      if (activeClasses.length === 0) {
        setStats({
          adequateRulePercent: 0,
          classesWithSample: 0,
          classesAdequateForRule: 0,
          activeTotal: 0,
        });
        return;
      }

      const { data: samples } = await supabase
        .from("moderation_samples")
        .select("*");

      const sampleList = samples || [];

      let classesWithSample = 0;
      let classesAdequateForRule = 0;

      activeClasses.forEach(cls => {
        const sample = sampleList.find(
          (s: { class_id: string }) => s.class_id === cls.id
        );
        const n = cls.learners?.length ?? 0;
        const required = Math.max(1, Math.ceil(n * 0.1));
        const saved = sample?.learner_ids?.length ?? 0;
        if (saved > 0) classesWithSample++;
        if (saved >= required) classesAdequateForRule++;
      });

      const activeTotal = activeClasses.length;
      const adequateRulePercent = Math.round((classesAdequateForRule / activeTotal) * 100);

      setStats({
        adequateRulePercent,
        classesWithSample,
        classesAdequateForRule,
        activeTotal,
      });
    };

    void fetchStats();
  }, [classes]);

  if (!stats) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Moderation readiness
          </CardTitle>

          <Link
            to="/evidence-audit"
            className="text-xs text-primary flex items-center gap-1"
          >
            Moderation overview <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <CardDescription>
          Saved moderation samples for active classes (learner selection only—no documents stored).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <FileCheck className="h-3 w-3 text-blue-600" />
              Classes meeting 10% sample rule
            </span>

            <span
              className={
                stats.adequateRulePercent < 80
                  ? "text-amber-600 font-bold"
                  : "text-green-600 font-bold"
              }
            >
              {stats.adequateRulePercent}%
            </span>
          </div>

          <Progress value={stats.adequateRulePercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-muted/30 p-2 rounded-md border text-center">
            <p className="text-xl font-bold">{stats.classesWithSample}</p>
            <p className="text-[10px] uppercase text-muted-foreground">
              With saved sample
            </p>
          </div>

          <div className="bg-muted/30 p-2 rounded-md border text-center">
            <p className="text-xl font-bold">
              {stats.classesAdequateForRule} / {stats.activeTotal}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">
              Meet 10% rule
            </p>
          </div>
        </div>

        {stats.classesAdequateForRule < stats.activeTotal && (
          <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>
              {stats.activeTotal - stats.classesAdequateForRule} class(es) need a saved moderation sample sized for at least 10% of learners (min 3).
            </span>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
