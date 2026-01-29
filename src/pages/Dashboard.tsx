import { useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardOverviewTab } from '@/components/dashboard/DashboardOverviewTab';
import { DashboardGroupedView } from '@/components/dashboard/DashboardGroupedView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LayoutGrid, GraduationCap, Loader2 } from 'lucide-react';
import { useClasses } from '@/context/ClassesContext';
import { GlobalAddNoteDialog } from '@/components/dialogs/GlobalAddNoteDialog';

const Dashboard = () => {
  const { loading } = useClasses();
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Preparing Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Professional overview of your academic workload and results.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border">
          <TabsTrigger value="overview" className="flex items-center gap-2 px-4">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2 px-4">
            <LayoutGrid className="h-4 w-4" /> By Subject
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2 px-4">
            <GraduationCap className="h-4 w-4" /> By Grade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DashboardOverviewTab 
            activeClasses={activeClasses}
            allActiveLearners={allActiveLearners}
            totalClassesCount={classes.length}
            onAddNote={() => setIsNoteDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="subjects">
          <DashboardGroupedView 
            activeClasses={activeClasses}
            groupedClasses={classesBySubject}
            groupBy="subject"
          />
        </TabsContent>

        <TabsContent value="grades">
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

export default Dashboard;