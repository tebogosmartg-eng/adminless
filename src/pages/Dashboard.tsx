import { BarChart3, BookOpen, GraduationCap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalStats from '@/components/GlobalStats';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardOverviewTab } from '@/components/DashboardOverviewTab';
import { DashboardGroupedView } from '@/components/DashboardGroupedView';

const Dashboard = () => {
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {activeClasses.length > 0 && <GlobalStats classes={activeClasses} />}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> By Subject
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> By Grade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardOverviewTab 
            activeClasses={activeClasses}
            allActiveLearners={allActiveLearners}
            totalClassesCount={classes.length}
          />
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <DashboardGroupedView 
            activeClasses={activeClasses}
            groupedClasses={classesBySubject}
            groupBy="subject"
          />
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <DashboardGroupedView 
            activeClasses={activeClasses}
            groupedClasses={classesByGrade}
            groupBy="grade"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;