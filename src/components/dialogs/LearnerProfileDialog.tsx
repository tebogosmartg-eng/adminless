import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Learner } from '@/lib/types';
import { ProfileSummaryTab } from '@/components/learner-profile/ProfileSummaryTab';
import { ProfileAttendanceTab } from '@/components/learner-profile/ProfileAttendanceTab';
import { ProfileHistoryTab } from '@/components/learner-profile/ProfileHistoryTab';
import { ProfileAcademicTab } from '@/components/learner-profile/ProfileAcademicTab';
import { ProfileNotesTab } from '@/components/learner-profile/ProfileNotesTab';
import { ModerationManager } from '@/components/evidence/ModerationManager';
import { useSettings } from '@/context/SettingsContext';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import { ChevronLeft, ChevronRight, GraduationCap, Share2, Book, Edit2, ShieldCheck, FileDown, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { generateLearnerReportPDF } from '@/utils/pdfGenerator';
import { useState, useEffect } from 'react';
import { useLearnerAnalytics } from '@/hooks/useLearnerAnalytics';
import { useLearnerAssessmentData } from '@/hooks/useLearnerAssessmentData';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsyncState } from '@/hooks/useAsyncState';
import { AsyncStatus } from '@/components/ui/AsyncStatus';
import { supabase } from '@/lib/supabaseClient';
import { logAdminLessError } from '@/utils/logAdminLessError';
import { isClassContentEditable } from '@/utils/classAmendment';

interface LearnerProfileDialogProps {
  learner: Learner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSubject: string;
  isAmendmentMode?: boolean;
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
  isAmendmentMode = false,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}: LearnerProfileDialogProps) => {
  const { gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { classes, renameLearner, updateLearnerComment } = useClasses();
  const { activeTerm, activeYear } = useAcademic();
  const [isExporting, setIsExporting] = useState(false);
  const actionState = useAsyncState();
  const learnerId = learner?.id;
  const profileLearnerId = open && learnerId ? learnerId : undefined;
  const profileAssessment = useLearnerAssessmentData(profileLearnerId);
  const currentClass = learnerId
    ? classes.find(c => c.learners.some(l => l.id === learnerId))
    : undefined;
  const currentClassId = currentClass?.id;
  const isEditable = isClassContentEditable(!!currentClass?.is_finalised, isAmendmentMode);
  const isLocked = !!activeTerm?.closed || !isEditable;
  const currentLearner = learnerId
    ? currentClass?.learners.find((item) => item.id === learnerId) ?? learner
    : null;
  const analytics = useLearnerAnalytics({
    learnerId: profileLearnerId,
    academicYearId: activeYear?.id,
    termId: activeTerm?.id,
    classId: currentClassId,
    ...(profileLearnerId
      ? {
          prefetchedResults: profileAssessment.results,
          prefetchedLoading: profileAssessment.loading,
          prefetchedError: profileAssessment.error,
          prefetchedIsFetching: profileAssessment.isFetching,
        }
      : {})
  });

  useEffect(() => {
    if (!open || !learnerId) return;
    if (!profileAssessment.error?.message) return;
    showError("Failed to load data");
  }, [open, learnerId, profileAssessment.error?.message]);

  if (!learnerId || !open) return null;
  const isProfileLoading = !currentLearner;

  const currentSymbol = currentLearner ? getGradeSymbol(currentLearner.mark, gradingScheme) : null;

  const handleShare = async () => {
    const text = `🎓 Learner Report\n👤 ${currentLearner.name}\n📚 ${classSubject}\n📊 Mark: ${currentLearner.mark}%`;
    try {
      await actionState.run(
        async () => navigator.clipboard.writeText(text),
        { status: "loading", userInitiated: false },
      );
      showSuccess("Summary copied.");
    } catch {
      showError("Failed to copy summary.");
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
        if (!currentClass) throw new Error("Class not found");

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Session expired");

        let attendanceQuery = supabase
          .from("attendance")
          .select("status")
          .eq("learner_id", learnerId)
          .eq("user_id", user.id);

        if (currentClass.id) {
          attendanceQuery = attendanceQuery.eq("class_id", currentClass.id);
        }

        if (activeTerm?.id) {
          attendanceQuery = attendanceQuery.eq("term_id", activeTerm.id);
        }

        const { data: attRecords, error: attendanceError } = await attendanceQuery;
        if (attendanceError) throw attendanceError;

        const safeAttendanceRecords = attRecords || [];
        const attStats = {
            present: safeAttendanceRecords.filter(r => r.status === 'present').length,
            absent: safeAttendanceRecords.filter(r => r.status === 'absent').length,
            late: safeAttendanceRecords.filter(r => r.status === 'late').length,
            total: safeAttendanceRecords.length,
            rate: safeAttendanceRecords.length > 0 ? Math.round(((safeAttendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length) / safeAttendanceRecords.length) * 100) : 0
        };
        await actionState.run(async () => generateLearnerReportPDF({
          learner: currentLearner,
          classInfo: { subject: currentClass.subject, grade: currentClass.grade, className: currentClass.className },
          gradingScheme,
          schoolName,
          teacherName,
          schoolLogo,
          contactEmail,
          contactPhone,
          attendance: attStats,
          analytics
        }), { status: "loading", userInitiated: false });
        showSuccess("PDF report generated.");
    } catch (e) {
        logAdminLessError('learner_profile_pdf_export', e);
        showError("Failed to load data");
    } finally {
        setIsExporting(false);
    }
  };

  const handleRename = async () => {
    if (!learnerId) return;
    const newName = prompt("New name:", currentLearner.name);
    if (newName && newName.trim() !== currentLearner.name) {
        await actionState.run(
          async () => renameLearner(learnerId, newName.trim(), { isAmendmentMode }),
          { status: "saving" },
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8 p-4 md:p-6 pb-2 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 max-w-[65%]">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onPrev} disabled={!hasPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    {isProfileLoading ? (
                      <Skeleton className="h-7 w-44" />
                    ) : (
                      <>
                        <DialogTitle className="text-lg md:text-xl truncate">{currentLearner.name}</DialogTitle>
                        {learnerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={handleRename}
                            disabled={isLocked}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                </div>
                {isProfileLoading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span className="text-xs text-muted-foreground truncate">{classSubject}</span>
                )}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onNext} disabled={!hasNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handleDownloadPDF} disabled={isExporting || isProfileLoading}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isExporting ? "Generating PDF..." : "PDF Report"}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void handleShare()} className="h-8 w-8" disabled={isProfileLoading}><Share2 className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>
        <div className="px-4 md:px-6 pb-2">
          <AsyncStatus
            state={{
              status: isExporting ? "saving" : actionState.status,
              error: actionState.error,
              retry: actionState.retry,
            }}
          />
        </div>
        
        <Tabs defaultValue="academic" className="flex-1 flex flex-col min-h-0 bg-muted/5">
            <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start p-1 h-auto min-h-[48px] bg-background border-b rounded-none shrink-0">
                <TabsTrigger value="academic" className="flex-none shrink-0 h-10 px-4"><GraduationCap className="h-4 w-4 mr-2 hidden sm:block" /> Academic</TabsTrigger>
                <TabsTrigger value="summary" className="flex-none shrink-0 h-10 px-4">Summary</TabsTrigger>
                <TabsTrigger value="moderation" className="flex-none shrink-0 h-10 px-4"><ShieldCheck className="h-4 w-4 mr-2 hidden sm:block" /> Moderation</TabsTrigger>
                <TabsTrigger value="history" className="flex-none shrink-0 h-10 px-4">History</TabsTrigger>
                <TabsTrigger value="attendance" className="flex-none shrink-0 h-10 px-4">Attendance</TabsTrigger>
                <TabsTrigger value="notes" className="flex-none shrink-0 h-10 px-4"><Book className="h-4 w-4 mr-2 hidden sm:block" /> Notes</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {isProfileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                <TabsContent value="academic" className="h-full m-0">
                  <ProfileAcademicTab
                    learnerId={learnerId}
                    academicYearId={activeYear?.id}
                    termId={activeTerm?.id}
                    classId={currentClassId}
                    prefetchedResults={profileLearnerId ? profileAssessment.results : undefined}
                    prefetchedLoading={profileLearnerId ? profileAssessment.loading : undefined}
                    prefetchedError={profileLearnerId ? profileAssessment.error : undefined}
                    prefetchedIsFetching={profileLearnerId ? profileAssessment.isFetching : undefined}
                  />
                </TabsContent>
                <TabsContent value="summary" className="h-full m-0">
                  <ProfileSummaryTab
                    learner={currentLearner}
                    classSubject={classSubject}
                    currentSymbol={currentSymbol}
                    weightedAverage={analytics.weightedAverage}
                    trend={analytics.trend}
                    weakAreas={analytics.weakAreas}
                    isLocked={isLocked}
                    onSaveComment={async (comment) => {
                      if (!learnerId) return;
                      if (isLocked) {
                        showError("Learner profile is locked for this finalized term.");
                        return;
                      }
                      await updateLearnerComment(learnerId, comment, { isAmendmentMode });
                    }}
                  />
                </TabsContent>
                <TabsContent value="moderation" className="h-full m-0">
                    {currentClassId && learnerId ? (
                        <ModerationManager
                          classId={currentClassId}
                          learnerId={learnerId}
                          learnerName={currentLearner.name}
                          termId={activeTerm?.id}
                          isLocked={isLocked}
                        />
                    ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                            Moderation needs a class record for this learner. If this learner was just added, save the class list and try again.
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="history" className="h-full m-0">
                  <ProfileHistoryTab
                    learnerId={learnerId}
                    academicYearId={activeYear?.id}
                    termId={activeTerm?.id}
                    classId={currentClassId}
                    prefetchedResults={profileLearnerId ? profileAssessment.results : undefined}
                    prefetchedLoading={profileLearnerId ? profileAssessment.loading : undefined}
                    prefetchedError={profileLearnerId ? profileAssessment.error : undefined}
                    prefetchedIsFetching={profileLearnerId ? profileAssessment.isFetching : undefined}
                  />
                </TabsContent>
                <TabsContent value="attendance" className="h-full m-0">
                  <ProfileAttendanceTab learnerId={learnerId} classId={currentClassId} termId={activeTerm?.id} />
                </TabsContent>
                <TabsContent value="notes" className="h-full m-0"><ProfileNotesTab learnerId={learnerId} isLocked={isLocked} /></TabsContent>
                  </>
                )}
            </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};