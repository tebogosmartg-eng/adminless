import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassInfo } from "@/components/CreateClassDialog";
import { useMemo } from "react";
import { Users, Percent, TrendingUp, TrendingDown, BookOpen } from "lucide-react";

interface GlobalStatsProps {
  classes: ClassInfo[];
}

const GlobalStats = ({ classes }: GlobalStatsProps) => {
  const stats = useMemo(() => {
    if (classes.length === 0) {
      return null;
    }

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
      
      if (marks.length === 0) {
        return { name: `${c.subject} - ${c.className}`, average: -1 };
      }
      
      const average = marks.reduce((acc, mark) => acc + mark, 0) / marks.length;
      return { name: `${c.subject} - ${c.className}`, average };
    }).filter(c => c.average !== -1);

    let bestClass = { name: "No data", average: "-" };
    if (classAverages.length > 0) {
      const best = classAverages.reduce((max, c) => c.average > max.average ? c : max, classAverages[0]);
      bestClass = { name: best.name, average: `${best.average.toFixed(1)}%` };
    }

    let worstClass = { name: "No data", average: "-" };
    if (classAverages.length > 0) {
      const worst = classAverages.reduce((min, c) => c.average < min.average ? c : min, classAverages[0]);
      worstClass = { name: worst.name, average: `${worst.average.toFixed(1)}%` };
    }

    return {
      totalClasses,
      totalLearners,
      overallAverage,
      bestClass,
      worstClass,
    };
  }, [classes]);

  if (!stats) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Overall Statistics</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">{stats.totalLearners} total learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallAverage}</div>
            <p className="text-xs text-muted-foreground">Based on captured marks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestClass.average}</div>
            <p className="text-xs text-muted-foreground truncate" title={stats.bestClass.name}>
              {stats.bestClass.name}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.worstClass.average}</div>
            <p className="text-xs text-muted-foreground truncate" title={stats.worstClass.name}>
              {stats.worstClass.name}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GlobalStats;