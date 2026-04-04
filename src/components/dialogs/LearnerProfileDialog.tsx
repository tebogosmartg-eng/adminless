import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Learner } from '@/lib/types';
import { ProfileSummaryTab } from '@/components/learner-profile/ProfileSummaryTab';
import { ProfileAttendanceTab } from '@/components/learner-profile/ProfileAttendanceTab';
import { ProfileHistoryTab } from '@/components/learner-profile/ProfileHistoryTab';
import { ProfileAcademicTab } from '@/components/learner-profile/ProfileAcademicTab';
import { ProfileNotesTab } from '@/components/learner-profile/ProfileNotesTab';
import { EvidenceManager } from '@/components/evidence/EvidenceManager';
import { useSettings } from '@/context/SettingsContext';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { useLearnerHistory } from '@/hooks/useLearnerHistory';
import { getGradeSymbol } from '@/utils/grading';
import { ChevronLeft, ChevronRight, GraduationCap, Share2, Book, Edit2, ShieldCheck, FileDown, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { generateLearnerReportPDF } from '@/utils/pdfGenerator';
import { useState } from 'react';
import { db } from '@/db';

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
  const { gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { classes, renameLearner } = useClasses();
  const { activeTerm } = useAcademic();
  const [isExporting, setIsExporting] = useState(false);
  
  const { history, stats, subjects, getSubjectColor } = useLearnerHistory(learner, classes);

  if (!learner) return null;

  const currentSymbol = getGradeSymbol(learner.mark, gradingScheme);

  const handleShare = () => {
    const text = `🎓 Learner Report\n👤 ${learner.name}\n📚 ${classSubject}\n📊 Mark: ${learner.mark}%`;
    navigator.clipboard.writeText(text);
    showSuccess("Summary copied.");
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
        const cls = classes.find(c => c.learners.some(l => l.id === learner.id));
        if (!cls) throw new Error("Class not found");

        const attRecords = await db.attendance.where('learner_id').equals(learner.id!).toArray();
        const attStats = {
            present: attRecords.filter(r => r.status === 'present').length,
            absent: attRecords.filter(r => r.status === 'absent').length,
            late: attRecords.filter(r => r.status === 'late').length,
            total: attRecords.length,
            rate: attRecords.length > 0 ? Math.round(((attRecords.filter(r => r.status === 'present' || r.status === 'late').length) / attRecords.length) * 100) : 0
        };

        await generateLearnerReportPDF(
            learner,
            { subject: cls.subject, grade: cls.grade, className: cls.className },
            gradingScheme,
            schoolName,
            teacherName,
            schoolLogo,
            contactEmail,
            contactPhone,
            attStats
        );
        showSuccess("PDF report generated.");
    } catch (e) {
        console.error(e);
        showError("Failed to generate PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleRename = async () => {
    if (!learner.id) return;
    const newName = prompt("New name:", learner.name);
    if (newName && newName.trim() !== learner.name) {
        await renameLearner(learner.id, newName.trim());
    }
  };

  const currentClassId = classes.find(c => c.learners.some(l => l.id === learner.id))?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8 p-4 md:p-6 pb-2 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 max-w-[65%]">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onPrev} disabled={!hasPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg md:text-xl truncate">{learner.name}</DialogTitle>
                    {learner.id && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleRename}><Edit2 className="h-3 w-3" /></Button>}
                </div>
                <span className="text-xs text-muted-foreground truncate">{classSubject}</span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onNext} disabled={!hasNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handleDownloadPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">PDF Report</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8"><Share2 className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="academic" className="flex-1 flex flex-col min-h-0 bg-muted/5">
            <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start p-1 h-auto min-h-[48px] bg-background border-b rounded-none shrink-0">
                <TabsTrigger value="academic" className="flex-none shrink-0 h-10 px-4"><GraduationCap className="h-4 w-4 mr-2 hidden sm:block" /> Academic</TabsTrigger>
                <TabsTrigger value="summary" className="flex-none shrink-0 h-10 px-4">Summary</TabsTrigger>
                <TabsTrigger value="evidence" className="flex-none shrink-0 h-10 px-4"><ShieldCheck className="h-4 w-4 mr-2 hidden sm:block" /> Evidence</TabsTrigger>
                <TabsTrigger value="history" className="flex-none shrink-0 h-10 px-4">History</TabsTrigger>
                <TabsTrigger value="attendance" className="flex-none shrink-0 h-10 px-4">Attendance</TabsTrigger>
                <TabsTrigger value="notes" className="flex-none shrink-0 h-10 px-4"><Book className="h-4 w-4 mr-2 hidden sm:block" /> Notes</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <TabsContent value="academic" className="h-full m-0"><ProfileAcademicTab learnerId={learner.id} /></TabsContent>
                <TabsContent value="summary" className="h-full m-0"><ProfileSummaryTab learner={learner} classSubject={classSubject} currentSymbol={currentSymbol} /></TabsContent>
                <TabsContent value="evidence" className="h-full m-0">
                    {currentClassId && learner.id && (
                        <EvidenceManager classId={currentClassId} learnerId={learner.id} learnerName={learner.name} termId={activeTerm?.id} isLocked={activeTerm?.closed} />
                    )}
                </TabsContent>
                <TabsContent value="history" className="h-full m-0"><ProfileHistoryTab history={history} stats={stats} subjects={subjects} getSubjectColor={getSubjectColor} /></TabsContent>
                <TabsContent value="attendance" className="h-full m-0"><ProfileAttendanceTab learnerId={learner.id} /></TabsContent>
                <TabsContent value="notes" className="h-full m-0"><ProfileNotesTab learnerId={learner.id} /></TabsContent>
            </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};