"use client";

import { useClasses } from "@/context/ClassesContext";
import { useAcademic } from "@/context/AcademicContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ListChecks, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const CurriculumProgressWidget = () => {
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();

  const stats = useLiveQuery(async () => {
    if (!activeTerm) return null;

    const activeClasses = classes.filter(c => !c.archived);
    if (activeClasses.length === 0) return null;

    // Get all topics for the active term
    const allTopics = await db.curriculum_topics.where('term_id').equals(activeTerm.id).toArray();
    if (allTopics.length === 0) return { totalPercent: 0, count: 0, topicsTotal: 0 };

    // Get all lesson logs to check coverage
    const allLogs = await db.lesson_logs.toArray();
    const coveredTopicIds = new Set(allLogs.flatMap(l => l.topic_ids || []));

    const coveredCount = allTopics.filter(t => coveredTopicIds.has(t.id)).length;
    const totalPercent = Math.round((coveredCount / allTopics.length) * 100);

    // Group by Subject for a breakdown
    const subjectBreakdown = Array.from(new Set(allTopics.map(t => t.subject))).map(sub => {
        const subTopics = allTopics.filter(t => t.subject === sub);
        const subCovered = subTopics.filter(t => coveredTopicIds.has(t.id)).length;
        return {
            subject: sub,
            percent: Math.round((subCovered / subTopics.length) * 100),
            count: subCovered,
            total: subTopics.length
        };
    });

    return { totalPercent, coveredCount, topicsTotal: allTopics.length, subjectBreakdown };
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
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                    Overall {activeTerm?.name} Progress
                </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] h-5">{stats.totalPercent}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={stats.totalPercent} className="h-1.5" />
        
        <div className="space-y-2">
            {stats.subjectBreakdown?.slice(0, 3).map(sub => (
                <div key={sub.subject} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium">
                        <span className="truncate max-w-[120px]">{sub.subject}</span>
                        <span className="text-muted-foreground">{sub.count}/{sub.total}</span>
                    </div>
                    <Progress value={sub.percent} className="h-1 bg-muted/30" />
                </div>
            ))}
        </div>

        <div className="pt-2 border-t mt-auto">
            <Button variant="link" size="sm" asChild className="h-auto p-0 text-[10px] uppercase font-black text-primary hover:no-underline">
                <Link to="/settings" className="flex items-center gap-1">
                    Manage Term Plan <ChevronRight className="h-3 w-3" />
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

import { Button } from "@/components/ui/button";