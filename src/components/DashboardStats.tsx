import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Learner } from "@/components/CreateClassDialog";
import { useMemo } from "react";

interface DashboardStatsProps {
  learners: Learner[];
}

const DashboardStats = ({ learners }: DashboardStatsProps) => {
  const stats = useMemo(() => {
    const markedLearners = learners.filter(l => l.mark && !isNaN(parseFloat(l.mark)));
    const marks = markedLearners.map(l => parseFloat(l.mark));

    if (marks.length === 0) {
      return {
        average: "N/A",
        passRate: "N/A",
        highestMark: "N/A",
        highestMarkLearner: "",
        lowestMark: "N/A",
        lowestMarkLearner: "",
        passCount: 0,
        totalWithMarks: 0,
      };
    }

    const sum = marks.reduce((acc, mark) => acc + mark, 0);
    const average = (sum / marks.length).toFixed(1);

    const passMark = 50;
    const passCount = marks.filter(mark => mark >= passMark).length;
    const passRate = ((passCount / marks.length) * 100).toFixed(0);

    const highestMark = Math.max(...marks);
    const highestMarkLearner = markedLearners.find(l => parseFloat(l.mark) === highestMark)?.name || "";
    
    const lowestMark = Math.min(...marks);
    const lowestMarkLearner = markedLearners.find(l => parseFloat(l.mark) === lowestMark)?.name || "";

    return {
      average: `${average}%`,
      passRate: `${passRate}%`,
      highestMark: `${highestMark}%`,
      highestMarkLearner,
      lowestMark: `${lowestMark}%`,
      lowestMarkLearner,
      passCount,
      totalWithMarks: marks.length,
    };
  }, [learners]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Class Average
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.average}</div>
          <p className="text-xs text-muted-foreground">
            Based on {stats.totalWithMarks} entered marks
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.passRate}</div>
          <p className="text-xs text-muted-foreground">
            {stats.passCount} out of {stats.totalWithMarks} learners passed
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Highest Mark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highestMark}</div>
          <p className="text-xs text-muted-foreground">
            {stats.highestMarkLearner ? `Achieved by ${stats.highestMarkLearner}` : ' '}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lowest Mark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lowestMark}</div>
          <p className="text-xs text-muted-foreground">
            {stats.lowestMarkLearner ? `Achieved by ${stats.lowestMarkLearner}` : ' '}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;