import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Learner } from "@/lib/types";
import { calculateClassStats } from "@/utils/stats";

const ClassStats = ({ learners }: { learners: Learner[] }) => {
  const stats = calculateClassStats(learners);

  return (
    <Card className="mb-6 print:shadow-none print:border-slate-300">
      <CardHeader>
        <CardTitle className="print:text-black">Class Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold print:text-black">{stats.average}%</p>
            <p className="text-sm text-muted-foreground print:text-slate-600">Class Average</p>
          </div>
          <div>
            <p className="text-2xl font-bold print:text-black">{stats.passRate}%</p>
            <p className="text-sm text-muted-foreground print:text-slate-600">Pass Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold print:text-black">{stats.highestMark}</p>
            <p className="text-sm text-muted-foreground print:text-slate-600">Highest Mark</p>
          </div>
          <div>
            <p className="text-2xl font-bold print:text-black">{stats.lowestMark}</p>
            <p className="text-sm text-muted-foreground print:text-slate-600">Lowest Mark</p>
          </div>
          <div>
            <p className="text-2xl font-bold print:text-black">{stats.learnersWithMarks} / {stats.totalLearners}</p>
            <p className="text-sm text-muted-foreground print:text-slate-600">Marks Captured</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassStats;