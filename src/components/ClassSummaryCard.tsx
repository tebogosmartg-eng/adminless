import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClassInfo } from "@/lib/types";
import { calculateClassStats } from "@/utils/stats";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

interface ClassSummaryCardProps {
  classInfo: ClassInfo;
}

const ClassSummaryCard = ({ classInfo }: ClassSummaryCardProps) => {
  const stats = calculateClassStats(classInfo.learners);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link to={`/classes/${classInfo.id}`} className="block">
        <CardHeader>
          <CardTitle className="text-lg truncate">{classInfo.subject} - {classInfo.className}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Class Average</span>
              <span className="text-xl font-bold">{stats.average}%</span>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-muted-foreground">Pass Rate</span>
                <span className="text-sm font-semibold">{stats.passRate}%</span>
              </div>
              <Progress value={stats.passRate} />
            </div>
            <div className="flex items-center text-sm text-muted-foreground pt-2 border-t">
              <Users className="h-4 w-4 mr-2" />
              <span>{classInfo.learners.length} Learners</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default ClassSummaryCard;