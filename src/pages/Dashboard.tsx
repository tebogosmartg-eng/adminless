import { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LayoutGrid, GraduationCap, Loader2 } from 'lucide-react';
import { useClasses } from '@/context/ClassesContext';
import { GlobalAddNoteDialog } from '@/components/dialogs/GlobalAddNoteDialog';
import { useSettings } from '@/context/SettingsContext';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DashboardOverviewTab } from '@/components/dashboard/DashboardOverviewTab';
import { DashboardGroupedView } from '@/components/dashboard/DashboardGroupedView';


const DashboardContent = () => {
  const { preloadClasses, isRefreshing: classesRefreshing } = useClasses();
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  const { onboardingCompleted, setOnboardingCompleted } = useSettings();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  useEffect(() => {
    void preloadClasses();
  }, [preloadClasses]);

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
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">Professional overview of your academic workload and results.</p>
          {classesRefreshing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing
            </span>
          )}
        </div>
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
      </Tabs>

      <GlobalAddNoteDialog 
        open={isNoteDialogOpen} 
        onOpenChange={setIsNoteDialogOpen} 
      />
    </div>
  );
};

const Dashboard = () => {
  return <DashboardContent />;
};

export default Dashboard;