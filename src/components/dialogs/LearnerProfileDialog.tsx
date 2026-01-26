import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Learner } from '@/lib/types';
import { ProfileSummaryTab } from '@/components/learner-profile/ProfileSummaryTab';
import { ProfileAttendanceTab } from '@/components/learner-profile/ProfileAttendanceTab';
import { ProfileHistoryTab } from '@/components/learner-profile/ProfileHistoryTab';
import { ProfileAcademicTab } from '@/components/learner-profile/ProfileAcademicTab';
import { useSettings } from '@/context/SettingsContext';
import { useClasses } from '@/context/ClassesContext';
import { useLearnerHistory } from '@/hooks/useLearnerHistory';
import { getGradeSymbol } from '@/utils/grading';
import { ChevronLeft, ChevronRight, GraduationCap, Share2 } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

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
  
  // Hook to get history across all classes based on learner name (Legacy/Aggregate view)
  const { history, stats, subjects, getSubjectColor } = useLearnerHistory(learner, classes);

  if (!learner) return null;

  const currentSymbol = getGradeSymbol(learner.mark, gradingScheme);

  const handleShare = () => {
    const text = `
🎓 *Learner Report*
👤 ${learner.name}
📚 ${classSubject}

📊 Current Mark: ${learner.mark ? learner.mark + '%' : 'N/A'}
${currentSymbol ? `🏷️ Symbol: ${currentSymbol.symbol} (Level ${currentSymbol.level})` : ''}
💬 Comment: ${learner.comment || 'No comment'}
    `.trim();
    
    navigator.clipboard.writeText(text);
    showSuccess("Learner summary copied to clipboard.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
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
            <div className="flex flex-col">
                <DialogTitle className="text-xl md:text-2xl">{learner.name}</DialogTitle>
                <span className="text-xs text-muted-foreground font-normal">{classSubject}</span>
            </div>
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
          <Button variant="ghost" size="icon" onClick={handleShare} title="Share Summary to WhatsApp/Text">
             <Share2 className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Tabs defaultValue="academic" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="academic" className="gap-2"><GraduationCap className="h-4 w-4 hidden sm:block" /> Academic</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="history">Overall</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="academic" className="flex-1 overflow-auto">
                <ProfileAcademicTab learnerId={learner.id} />
            </TabsContent>

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