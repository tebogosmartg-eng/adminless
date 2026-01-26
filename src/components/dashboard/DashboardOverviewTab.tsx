import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, Camera } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';
import ClassComparisonChart from '@/components/charts/ClassComparisonChart';
import MarkDistributionChart from '@/components/charts/MarkDistributionChart';
import RecentActivity from './RecentActivity';
import AtRiskLearners from './AtRiskLearners';
import { DailyAttendanceCard } from './DailyAttendanceCard';
import { TodoList } from './TodoList';
import { PendingActions } from './PendingActions';
import { ActiveTermStats } from './ActiveTermStats';
import { UpcomingAssessments } from './UpcomingAssessments';
import { ClassInfo, Learner } from '@/lib/types';

interface DashboardOverviewTabProps {
  activeClasses: ClassInfo[];
  allActiveLearners: Learner[];
  totalClassesCount: number;
}

export const DashboardOverviewTab = ({ activeClasses, allActiveLearners, totalClassesCount }: DashboardOverviewTabProps) => {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        
        <ActiveTermStats />

        {activeClasses.length > 0 && (
           <PendingActions classes={activeClasses} />
        )}

        {activeClasses.length > 0 && (
          <>
            <ClassComparisonChart classes={activeClasses} />
            <MarkDistributionChart 
              learners={allActiveLearners} 
              title="Global Grade Distribution" 
              description="Distribution of symbols across active classes." 
            />
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Active Classes</CardTitle>
            <CardDescription>Quick access to your current class registers.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeClasses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeClasses.map(classInfo => (
                  <ClassSummaryCard key={classInfo.id} classInfo={classInfo} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">No active classes</h3>
                <p className="text-muted-foreground mt-1 mb-6">
                  {totalClassesCount > 0 
                    ? "All your classes are archived." 
                    : "You haven't created any classes yet."}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild>
                    <Link to="/classes">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Manually
                    </Link>
                  </Button>
                  <span className="text-xs text-muted-foreground">OR</span>
                  <Button asChild variant="outline">
                    <Link to="/scan">
                      <Camera className="mr-2 h-4 w-4" /> Scan Scripts (AI)
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1 space-y-6">
        <UpcomingAssessments />
        <DailyAttendanceCard />
        <TodoList />
        <AtRiskLearners />
        <RecentActivity />
      </div>
    </div>
  );
};