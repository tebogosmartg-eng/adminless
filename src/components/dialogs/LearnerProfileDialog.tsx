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

        // Fetch attendance stats for the PDF
        const attRecords = await db.attendance.where('learner_id').equals(learner.id!).toArray();
        const attStats = {
            present: attRecords.filter(r => r.status === 'present').length,
            absent: attRecords.filter(r => r.status === 'absent').length,
            late: attRecords.filter(r => r.status === 'late').length,
            total: attRecords.length,
            rate: attRecords.length > 0 ? Math.round(((attRecords.filter(r => r.status === 'present' || r.status === 'late').length) / attRecords.length) * 100) : 0
        };

        generateLearnerReportPDF(
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
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev} disabled={!hasPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl">{learner.name}</DialogTitle>
                    {learner.id && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRename}><Edit2 className="h-3 w-3" /></Button>}
                </div>
                <span className="text-xs text-muted-foreground">{classSubject}</span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext} disabled={!hasNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handleDownloadPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                PDF Report
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8"><Share2 className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="academic" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="academic"><GraduationCap className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="summary">Sum</TabsTrigger>
                <TabsTrigger value="evidence"><ShieldCheck className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="history">Hist</TabsTrigger>
                <TabsTrigger value="attendance">Att</TabsTrigger>
                <TabsTrigger value="notes"><Book className="h-4 w-4" /></TabsTrigger>
            </TabsList>
            
            <TabsContent value="academic" className="flex-1 overflow-auto"><ProfileAcademicTab learnerId={learner.id} /></TabsContent>
            <TabsContent value="summary" className="flex-1 overflow-auto"><ProfileSummaryTab learner={learner} classSubject={classSubject} currentSymbol={currentSymbol} /></TabsContent>
            <TabsContent value="evidence" className="flex-1 overflow-auto pt-4">
                {currentClassId && learner.id && (
                    <EvidenceManager classId={currentClassId} learnerId={learner.id} learnerName={learner.name} termId={activeTerm?.id} isLocked={activeTerm?.closed} />
                )}
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-auto"><ProfileHistoryTab history={history} stats={stats} subjects={subjects} getSubjectColor={getSubjectColor} /></TabsContent>
            <TabsContent value="attendance" className="flex-1 overflow-auto"><ProfileAttendanceTab learnerId={learner.id} /></TabsContent>
            <TabsContent value="notes" className="flex-1 overflow-hidden h-full"><ProfileNotesTab learnerId={learner.id} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};