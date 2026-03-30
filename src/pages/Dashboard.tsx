import { useState, useEffect, lazy, Suspense } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LayoutGrid, GraduationCap, Loader2 } from 'lucide-react';
import { useClasses } from '@/context/ClassesContext';
import { GlobalAddNoteDialog } from '@/components/dialogs/GlobalAddNoteDialog';
import { useSettings } from '@/context/SettingsContext';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const DashboardOverviewTab = lazy(() => import('@/components/dashboard/DashboardOverviewTab').then(m => ({ default: m.DashboardOverviewTab })));
const DashboardGroupedView = lazy(() => import('@/components/dashboard/DashboardGroupedView').then(m => ({ default: m.DashboardGroupedView })));

const DashboardContent = () => {
  const { loading } = useClasses();
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  const { onboardingCompleted, setOnboardingCompleted, isLoadingProfile } = useSettings();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  if (loading || isLoadingProfile) {
    return <LoadingScreen />;
  }

  if (!onboardingCompleted) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] w-full items-center justify-center p-4 animate-in fade-in duration-500">
        <OnboardingWizard onComplete={() => setOnboardingCompleted(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-xs">Professional overview of your academic workload and results.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 w-full">
        <TabsList className="bg-muted/50 p-1 border h-auto min-h-10 flex flex-wrap w-full sm:w-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-2 px-3 py-1.5 h-auto text-xs flex-1 sm:flex-none whitespace-nowrap">
            <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center justify-center gap-2 px-3 py-1.5 h-auto text-xs flex-1 sm:flex-none whitespace-nowrap">
            <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">By Subject</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center justify-center gap-2 px-3 py-1.5 h-auto text-xs flex-1 sm:flex-none whitespace-nowrap">
            <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">By Grade</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<LoadingScreen />}>
          <TabsContent value="overview" className="mt-0">
            <DashboardOverviewTab 
              activeClasses={activeClasses}
              allActiveLearners={allActiveLearners}
              totalClassesCount={classes.length}
              onAddNote={() => setIsNoteDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="subjects" className="mt-0">
            <DashboardGroupedView 
              activeClasses={activeClasses}
              groupedClasses={classesBySubject}
              groupBy="subject"
            />
          </TabsContent>

          <TabsContent value="grades" className="mt-0">
            <DashboardGroupedView 
              activeClasses={activeClasses}
              groupedClasses={classesByGrade}
              groupBy="grade"
            />
          </TabsContent>
        </Suspense>
      </Tabs>

      <GlobalAddNoteDialog 
        open={isNoteDialogOpen} 
        onOpenChange={setIsNoteDialogOpen} 
      />
    </div>
  );
};

const Dashboard = () => {
  const { user, authReady } = useAuthGuard();

  if (!authReady) return <LoadingScreen />;
  if (!user) return null;

  return <DashboardContent />;
};

export default Dashboard;