"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { useClasses } from "@/context/ClassesContext";
import { useAcademic } from "@/context/AcademicContext";

import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";
import { ListChecks, ChevronRight } from "lucide-react";

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const CurriculumProgressWidget = () => {
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!activeTerm) return;

      const activeClasses = classes.filter(c => !c.archived);
      if (activeClasses.length === 0) return;

      // 🔥 Fetch curriculum topics
      const { data: topics } = await supabase
        .from("curriculum_topics")
        .select("*")
        .eq("term_id", activeTerm.id);

      if (!topics || topics.length === 0) {
        setStats({
          totalPercent: 0,
          topicsTotal: 0,
          subjectBreakdown: []
        });
        return;
      }

      // 🔥 Fetch lesson logs
      const { data: logs } = await supabase
        .from("lesson_logs")
        .select("*");

      const coveredTopicIds = new Set(
        (logs || []).flatMap((l: any) => l.topic_ids || [])
      );

      const coveredCount = topics.filter((t: any) =>
        coveredTopicIds.has(t.id)
      ).length;

      const totalPercent = Math.round(
        (coveredCount / topics.length) * 100
      );

      // 🔥 Subject breakdown
      const subjects = [...new Set(topics.map((t: any) => t.subject))];

      const subjectBreakdown = subjects.map((sub: any) => {
        const subTopics = topics.filter((t: any) => t.subject === sub);

        const subCovered = subTopics.filter((t: any) =>
          coveredTopicIds.has(t.id)
        ).length;

        return {
          subject: String(sub),
          percent: Math.round((subCovered / subTopics.length) * 100),
          count: subCovered,
          total: subTopics.length
        };
      });

      setStats({
        totalPercent,
        coveredCount,
        topicsTotal: topics.length,
        subjectBreakdown
      });
    };

    fetchStats();
  }, [activeTerm, classes]);

  if (!stats || stats.topicsTotal === 0) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Curriculum Coverage
            </CardTitle>

            <CardDescription className="text-[10px] uppercase font-bold">
              Overall {activeTerm?.name} Progress
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-[10px] h-5">
            {stats.totalPercent}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={stats.totalPercent} className="h-1.5" />

        <div className="space-y-2">
          {stats.subjectBreakdown.slice(0, 3).map((sub: any) => (
            <div key={sub.subject} className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium">
                <span className="truncate max-w-[120px]">
                  {sub.subject}
                </span>
                <span className="text-muted-foreground">
                  {sub.count}/{sub.total}
                </span>
              </div>

              <Progress value={sub.percent} className="h-1 bg-muted/30" />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t mt-auto">
          <Button
            variant="link"
            size="sm"
            asChild
            className="h-auto p-0 text-[10px] font-black text-primary"
          >
            <Link to="/settings" className="flex items-center gap-1">
              Manage Term Plan
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};