import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Learner } from "@/types";
import { calculateClassStats } from "@/utils/stats";

const ClassStats = ({ learners }: { learners: Learner[] }) => {
  const stats = calculateClassStats(learners);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Class Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{stats.average}%</p>
            <p className="text-sm text-muted-foreground">Class Average</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.passRate}%</p>
            <p className="text-sm text-muted-foreground">Pass Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.highestMark}</p>
            <p className="text-sm text-muted-foreground">Highest Mark</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.lowestMark}</p>
            <p className="text-sm text-muted-foreground">Lowest Mark</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.learnersWithMarks} / {stats.totalLearners}</p>
            <p className="text-sm text-muted-foreground">Marks Captured</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassStats;