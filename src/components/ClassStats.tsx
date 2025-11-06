import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Learner } from "@/components/CreateClassDialog";
import { Percent, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";

interface ClassStatsProps {
  learners: Learner[];
}

const ClassStats = ({ learners }: ClassStatsProps) => {
  const stats = useMemo(() => {
    const marks = learners
      .map(l => l.mark)
      .filter(mark => mark && !isNaN(parseFloat(mark)))
      .map(mark => parseFloat(mark));

    if (marks.length === 0) {
      return {
        average: "N/A",
        highest: "N/A",
        lowest: "N/A",
        markedCount: 0,
        totalCount: learners.length,
      };
    }

    const average = (marks.reduce((acc, mark) => acc + mark, 0) / marks.length).toFixed(1) + '%';
    const highest = Math.max(...marks).toFixed(1) + '%';
    const lowest = Math.min(...marks).toFixed(1) + '%';

    return {
      average,
      highest,
      lowest,
      markedCount: marks.length,
      totalCount: learners.length,
    };
  }, [learners]);

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Class Average</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.average}</div>
          <p className="text-xs text-muted-foreground">Based on entered marks</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Highest Mark</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highest}</div>
          <p className="text-xs text-muted-foreground">Top score in the class</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lowest Mark</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lowest}</div>
          <p className="text-xs text-muted-foreground">Lowest score in the class</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Marking Progress</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.markedCount} / {stats.totalCount}</div>
          <p className="text-xs text-muted-foreground">Learners with marks entered</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassStats;