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

interface DashboardOverviewTabProps {
  activeClasses: ClassInfo[];
  allActiveLearners: Learner[];
  totalClassesCount: number;
}

export const DashboardOverviewTab = ({ activeClasses, allActiveLearners, totalClassesCount }: DashboardOverviewTabProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <GlobalStats classes={activeClasses} />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeClasses.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <PendingActions classes={activeClasses} />
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
                <CardTitle className="text-xl">Welcome to SmaReg</CardTitle>
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
          <RecentAlerts />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};