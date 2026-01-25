import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Learner } from "@/components/CreateClassDialog";
import { getGradeSymbol } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";
import { useClasses } from "@/context/ClassesContext";
import { User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateLearnerReportPDF } from "@/utils/pdfGenerator";
import { showSuccess } from "@/utils/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLearnerHistory } from "@/hooks/useLearnerHistory";
import { ProfileSummaryTab } from "@/components/learner-profile/ProfileSummaryTab";
import { ProfileHistoryTab } from "@/components/learner-profile/ProfileHistoryTab";
import { ProfileAttendanceTab } from "@/components/learner-profile/ProfileAttendanceTab";

interface LearnerProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learner: Learner | null;
  classSubject: string;
}

export const LearnerProfileDialog = ({ isOpen, onOpenChange, learner, classSubject }: LearnerProfileDialogProps) => {
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  const { classes } = useClasses();
  
  const { history, stats, subjects, getSubjectColor } = useLearnerHistory(learner, classes);

  if (!learner) return null;

  const currentSymbol = getGradeSymbol(learner.mark, gradingScheme);

  const handleDownloadReport = () => {
    const tempClassInfo = {
      subject: classSubject,
      grade: "", 
      className: "" 
    };

    generateLearnerReportPDF(learner, tempClassInfo, gradingScheme, schoolName, teacherName, schoolLogo);
    showSuccess(`Report downloaded for ${learner.name}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-primary/10 p-2.5 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              {learner.name}
              <p className="text-sm font-normal text-muted-foreground">Performance Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Report</TabsTrigger>
            <TabsTrigger value="history">History & Trends</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="flex-1 overflow-hidden">
             <ProfileSummaryTab 
                learner={learner} 
                classSubject={classSubject} 
                currentSymbol={currentSymbol} 
             />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden">
             <ProfileHistoryTab 
                history={history} 
                stats={stats} 
                subjects={subjects} 
                getSubjectColor={getSubjectColor} 
             />
          </TabsContent>

          <TabsContent value="attendance" className="flex-1 overflow-hidden">
             <ProfileAttendanceTab learnerId={learner.id} />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};