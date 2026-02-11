character in JSX text to fix the compilation error.">
"use client";

import { useCurriculumProgress } from "@/hooks/useCurriculumProgress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassCurriculumTabProps {
  classId: string;
  subject: string;
  grade: string;
}

export const ClassCurriculumTab = ({ classId, subject, grade }: ClassCurriculumTabProps) => {
  const { data, loading } = useCurriculumProgress(subject, grade, classId);

  if (loading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Checking curriculum status...</div>;

  if (!data || data.topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5 mt-6">
        <BookOpen className="h-10 w-10 mb-2 opacity-20" />
        <h3 className="font-semibold text-foreground">No Plan for {subject}</h3>
        <p className="text-xs max-w-xs mt-1">
          Define topics for this subject and grade in **Settings > Curriculum** to see your progress checklist here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Term Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary">{data.percent}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">
                {data.coveredCount} of {data.totalCount} topics logged
            </p>
            <Progress value={data.percent} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-none border bg-muted/10">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Outstanding Work
                </CardTitle>
                <CardDescription className="text-xs">Topics yet to be recorded in this class's journal.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {data.topics.filter(t => !t.isCovered).map(t => (
                        <Badge key={t.id} variant="outline" className="bg-background">{t.title}</Badge>
                    ))}
                    {data.coveredCount === data.totalCount && (
                        <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Curriculum fully covered!
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Planned Topics Checklist</h3>
        <div className="grid gap-2">
            {data.topics.map((topic, i) => (
                <div 
                    key={topic.id} 
                    className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                        topic.isCovered 
                            ? "bg-green-50/50 border-green-100 opacity-80" 
                            : "bg-card border-border hover:border-primary/30"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full border-2",
                            topic.isCovered ? "bg-green-100 border-green-500 text-green-700" : "bg-muted border-muted-foreground/20 text-muted-foreground"
                        )}>
                            {topic.isCovered ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[10px] font-black">{i+1}</span>}
                        </div>
                        <div>
                            <p className={cn("text-sm font-bold", topic.isCovered && "line-through text-muted-foreground")}>
                                {topic.title}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">
                                {topic.isCovered ? "Recorded in Journal" : "Pending Instruction"}
                            </p>
                        </div>
                    </div>
                    {topic.isCovered && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-none font-bold text-[9px] uppercase tracking-tighter">Covered</Badge>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};