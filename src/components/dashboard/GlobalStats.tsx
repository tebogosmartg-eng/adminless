import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassInfo } from "@/lib/types";
import { useMemo } from "react";
import { Percent, TrendingUp, TrendingDown, BookOpen } from "lucide-react";

interface GlobalStatsProps {
  classes: ClassInfo[];
}

const GlobalStats = ({ classes }: GlobalStatsProps) => {
  const stats = useMemo(() => {
    if (classes.length === 0) return null;

    const totalLearners = classes.reduce((acc, c) => acc + c.learners.length, 0);
    const totalClasses = classes.length;

    const allMarks = classes.flatMap(c => c.learners)
      .map(l => l.mark)
      .filter(mark => mark && !isNaN(parseFloat(mark)))
      .map(mark => parseFloat(mark));

    const overallAverage = allMarks.length > 0
      ? (allMarks.reduce((acc, mark) => acc + mark, 0) / allMarks.length).toFixed(1) + '%'
      : "No data";

    const classAverages = classes.map(c => {
      const marks = c.learners
        .map(l => l.mark)
        .filter(mark => mark && !isNaN(parseFloat(mark)))
        .map(mark => parseFloat(mark));
      
      if (marks.length === 0) return { name: `${c.subject} - ${c.className}`, average: -1 };
      
      const average = marks.reduce((acc, mark) => acc + mark, 0) / marks.length;
      return { name: `${c.subject} - ${c.className}`, average };
    }).filter(c => c.average !== -1);

    let bestClass = { name: "N/A", average: "-" };
    if (classAverages.length > 0) {
      const best = classAverages.reduce((max, c) => c.average > max.average ? c : max, classAverages[0]);
      bestClass = { name: best.name, average: `${best.average.toFixed(1)}%` };
    }

    let needsAttention = { name: "N/A", average: "-" };
    if (classAverages.length > 0) {
      const worst = classAverages.reduce((min, c) => c.average < min.average ? c : min, classAverages[0]);
      needsAttention = { name: worst.name, average: `${worst.average.toFixed(1)}%` };
    }

    return {
      totalClasses,
      totalLearners,
      overallAverage,
      bestClass,
      needsAttention,
    };
  }, [classes]);

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classes</CardTitle>
          <BookOpen className="h-4 w-4 text-primary opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.totalClasses}</div>
          <p className="text-[10px] text-muted-foreground mt-1">{stats.totalLearners} total learners</p>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Mark</CardTitle>
          <Percent className="h-4 w-4 text-primary opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.overallAverage}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Global performance</p>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Performer</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.bestClass.average}</div>
          <p className="text-[10px] text-muted-foreground mt-1 truncate">{stats.bestClass.name}</p>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm bg-white dark:bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lower Tier</CardTitle>
          <TrendingDown className="h-4 w-4 text-amber-600 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{stats.needsAttention.average}</div>
          <p className="text-[10px] text-muted-foreground mt-1 truncate">{stats.needsAttention.name}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalStats;