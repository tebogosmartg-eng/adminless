import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Learner } from "@/lib/types";
import { calculateClassStats } from "@/utils/stats";
import { cn } from "@/lib/utils";

interface ClassStatsProps {
  learners: Learner[];
  isDocumentMode?: boolean;
}

const ClassStats = ({ learners, isDocumentMode = false }: ClassStatsProps) => {
  const stats = calculateClassStats(learners);

  const Content = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
      <div>
        <p className={cn("text-2xl font-bold", isDocumentMode && "text-slate-900")}>{stats.average}%</p>
        <p className={cn("text-sm text-muted-foreground", isDocumentMode && "text-slate-600")}>Class Average</p>
      </div>
      <div>
        <p className={cn("text-2xl font-bold", isDocumentMode && "text-slate-900")}>{stats.passRate}%</p>
        <p className={cn("text-sm text-muted-foreground", isDocumentMode && "text-slate-600")}>Pass Rate</p>
      </div>
      <div>
        <p className={cn("text-2xl font-bold", isDocumentMode && "text-slate-900")}>{stats.highestMark}</p>
        <p className={cn("text-sm text-muted-foreground", isDocumentMode && "text-slate-600")}>Highest Mark</p>
      </div>
      <div>
        <p className={cn("text-2xl font-bold", isDocumentMode && "text-slate-900")}>{stats.lowestMark}</p>
        <p className={cn("text-sm text-muted-foreground", isDocumentMode && "text-slate-600")}>Lowest Mark</p>
      </div>
      <div>
        <p className={cn("text-2xl font-bold", isDocumentMode && "text-slate-900")}>{stats.learnersWithMarks} / {stats.totalLearners}</p>
        <p className={cn("text-sm text-muted-foreground", isDocumentMode && "text-slate-600")}>Marks Captured</p>
      </div>
    </div>
  );

  if (isDocumentMode) {
    return (
      <div className="mb-6 border border-slate-200 rounded-xl bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Class Statistics</h3>
        <Content />
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Class Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <Content />
      </CardContent>
    </Card>
  );
};

export default ClassStats;