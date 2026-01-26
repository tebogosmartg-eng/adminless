import { BarChart3, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalStats from '@/components/dashboard/GlobalStats';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardOverviewTab } from '@/components/dashboard/DashboardOverviewTab';
import { DashboardGroupedView } from '@/components/dashboard/DashboardGroupedView';
import { useClasses } from '@/context/ClassesContext';
import { QuickActions } from '@/components/dashboard/QuickActions';

const Dashboard = () => {
  const { loading } = useClasses();
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  if (loading) {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
         <div className="lg:col-span-3 space-y-6">
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
         <div className="lg:col-span-1 space-y-6">
            <QuickActions />
            {/* We can hide other widgets on mobile or rearrange */}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;