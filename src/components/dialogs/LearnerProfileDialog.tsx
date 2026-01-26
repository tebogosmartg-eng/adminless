import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Learner } from '@/lib/types';
import { ProfileSummaryTab } from '@/components/learner-profile/ProfileSummaryTab';
import { ProfileAttendanceTab } from '@/components/learner-profile/ProfileAttendanceTab';
import { ProfileHistoryTab } from '@/components/learner-profile/ProfileHistoryTab';
import { useSettings } from '@/context/SettingsContext';
import { useClasses } from '@/context/ClassesContext';
import { useLearnerHistory } from '@/hooks/useLearnerHistory';
import { getGradeSymbol } from '@/utils/grading';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LearnerProfileDialogProps {
  learner: Learner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSubject: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const LearnerProfileDialog = ({ 
  learner, 
  open, 
  onOpenChange, 
  classSubject,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}: LearnerProfileDialogProps) => {
  const { gradingScheme } = useSettings();
  const { classes } = useClasses();
  
  // Hook to get history across all classes based on learner name
  const { history, stats, subjects, getSubjectColor } = useLearnerHistory(learner, classes);

  if (!learner) return null;

  const currentSymbol = getGradeSymbol(learner.mark, gradingScheme);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onPrev} 
              disabled={!hasPrev}
              title="Previous Learner"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-2xl">{learner.name}</DialogTitle>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onNext} 
              disabled={!hasNext}
              title="Next Learner"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="history">History & Trends</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="flex-1 overflow-auto">
                <ProfileSummaryTab 
                    learner={learner} 
                    classSubject={classSubject} 
                    currentSymbol={currentSymbol} 
                />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-auto">
                <ProfileHistoryTab 
                    history={history} 
                    stats={stats} 
                    subjects={subjects} 
                    getSubjectColor={getSubjectColor} 
                />
            </TabsContent>
            
            <TabsContent value="attendance" className="flex-1 overflow-auto">
                <ProfileAttendanceTab learnerId={learner.id} />
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};