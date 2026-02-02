import GlobalStats from './GlobalStats';
import ClassComparisonChart from '@/components/charts/ClassComparisonChart';
import MarkDistributionChart from '@/components/charts/MarkDistributionChart';
import AtRiskLearners from './AtRiskLearners';
import RecentActivity from './RecentActivity';
import { PendingActions } from './PendingActions';
import { UpcomingAssessments } from './UpcomingAssessments';
import { RecentAlerts } from './RecentAlerts';
import { ClassInfo, Learner } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, Camera } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';
import { QuickActions } from './QuickActions';
import { TopLearnersPerGrade } from './TopLearnersPerGrade';
import { ActiveTermStats } from './ActiveTermStats';
import { TermProgressWidget } from './TermProgressWidget';
import { YearPerformanceTrend } from './YearPerformanceTrend';
import { TimetableWidget } from './TimetableWidget';
import { DailyAttendanceCard } from './DailyAttendanceCard';
import { TodoList } from './TodoList';
import { AdminDebtWidget } from './AdminDebtWidget';

interface DashboardOverviewTabProps {
  activeClasses: ClassInfo[];
  allActiveLearners: Learner[];
  totalClassesCount: number;
  onAddNote: () => void;
}

export const DashboardOverviewTab = ({ 
  activeClasses, 
  allActiveLearners, 
  totalClassesCount,
  onAddNote
}: DashboardOverviewTabProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-3">
         <div className="md:col-span-2">
            <ActiveTermStats />
         </div>
         <TermProgressWidget />
      </div>

      <GlobalStats classes={activeClasses} />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeClasses.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <AdminDebtWidget />
                <QuickActions onAddNote={onAddNote} />
              </div>
              
              <YearPerformanceTrend />
              
              <div className="grid gap-6 md:grid-cols-2">
                <DailyAttendanceCard />
                <UpcomingAssessments />
              </div>

              <ClassComparisonChart classes={activeClasses} />
              
              <div className="grid gap-6 md:grid-cols-2">
                <MarkDistributionChart 
                  learners={allActiveLearners} 
                  title="Global Symbol Spread" 
                  description="Aggregate distribution across all classes."
                />
                <AtRiskLearners />
              </div>
            </>
          ) : (
            <Card className="border-dashed border-2 bg-transparent flex flex-col items-center justify-center py-16 text-center">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Welcome to AdminLess</CardTitle>
                <CardDescription>Start by creating your first class to see analytics.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button asChild>
                  <Link to="/classes">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Class
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/scan">
                    <Camera className="mr-2 h-4 w-4" /> Scan Marksheet
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {activeClasses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Quick Class Access</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {activeClasses.map(c => (
                  <ClassSummaryCard key={c.id} classInfo={c} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <TimetableWidget />
          <TodoList />
          <TopLearnersPerGrade classes={activeClasses} />
          <RecentAlerts />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};