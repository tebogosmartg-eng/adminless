import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassInfo } from "@/lib/types";
import { Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ClassSummaryCardProps {
  classInfo: ClassInfo;
}

const ClassSummaryCard = ({ classInfo }: ClassSummaryCardProps) => {
  return (
    <Card className="hover:shadow-md transition-all group">
      <Link to={`/classes/${classInfo.id}`} className="block">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
            {classInfo.subject} - {classInfo.className}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                <span>{classInfo.learners.length} Learners</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                {classInfo.grade} • Term Context Required for Analysis
            </p>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default ClassSummaryCard;