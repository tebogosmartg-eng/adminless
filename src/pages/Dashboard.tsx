import { useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardOverviewTab } from '@/components/dashboard/DashboardOverviewTab';
import { DashboardGroupedView } from '@/components/dashboard/DashboardGroupedView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LayoutGrid, GraduationCap, Loader2 } from 'lucide-react';
import { useClasses } from '@/context/ClassesContext';
import { GlobalAddNoteDialog } from '@/components/dialogs/GlobalAddNoteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';

const Dashboard = () => {
  const { loading } = useClasses();
  const { 
    classes,
    activeClasses, 
    allActiveLearners, 
    classesBySubject, 
    classesByGrade 
  } = useDashboardData();

  const { onboardingCompleted, setOnboardingCompleted } = useSettings();
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
    <div className="space-y-4 pb-6 w-full">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-xs">Professional overview of your academic workload and results.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 w-full">
        <TabsList className="bg-muted/50 p-1 border h-auto min-h-9 flex flex-wrap w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2 px-4 h-8 text-xs flex-1 sm:flex-none">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2 px-4 h-8 text-xs flex-1 sm:flex-none">
            <LayoutGrid className="h-3.5 w-3.5" /> By Subject
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2 px-4 h-8 text-xs flex-1 sm:flex-none">
            <GraduationCap className="h-3.5 w-3.5" /> By Grade
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

      <Dialog open={!onboardingCompleted} onOpenChange={(open) => { if (!open) setOnboardingCompleted(true); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Welcome to AdminLess</DialogTitle>
            <DialogDescription>Let's get you set up and ready for the term.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To help you get the most out of AdminLess, we've prepared a quick onboarding checklist. We'll guide you through setting up your profile, academic calendar, and your first class.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setOnboardingCompleted(true)}>Skip for now</Button>
            <Button onClick={() => setOnboardingCompleted(true)} className="font-bold">Get Started</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;