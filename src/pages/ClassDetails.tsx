import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { ClassInfo } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassHeader } from "@/components/ClassHeader";
import { MarkSheet } from "@/components/assessments/MarkSheet"; 
import { AttendanceView } from "@/components/AttendanceView";
import { ClassDialogsManager } from "@/components/ClassDialogsManager";
import { EvidenceManager } from "@/components/evidence/EvidenceManager";
import { ClassAnalysisTab } from "@/components/analysis/ClassAnalysisTab";
import { ClassReportsTab } from "@/components/ClassDetails/ClassReportsTab";
import { DiagnosticReportDialog } from "@/components/assessments/DiagnosticReportDialog";
import { useLearnerState } from "@/hooks/useLearnerState";
import { useAiFeatures } from "@/hooks/useAiFeatures";
import { useClassExport } from "@/hooks/useClassExport";
import { useClassDialogs } from "@/hooks/useClassDialogs";
import { 
  ShieldCheck, 
  BarChart3, 
  FileDown,
  Camera
} from "lucide-react";
import { showError } from "@/utils/toast";
import { generateSASAMSExport } from "@/utils/sasams";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchClassInsights } from "@/hooks/useClassAnalysis";

import Scan from "@/pages/Scan";

const ClassDetailsContent = () => {
  const { classId } = useParams();
  const { classes, isLoading, hasLoadedOnce } = useClasses();

  if (isLoading || !hasLoadedOnce) {
    return (
      <div className="space-y-4 w-full p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  if (!classId) {
    return <div className="p-8 text-center text-muted-foreground">Class not found.</div>;
  }

  const classInfo = classes.find((c) => c.id === classId);
  if (!classInfo) {
    return <div className="p-8 text-center text-muted-foreground">Class not found.</div>;
  }

  return <ClassDetailsLoaded classId={classId} classInfo={classInfo} />;
};

const ClassDetailsLoaded = ({ classId, classInfo }: { classId: string; classInfo: ClassInfo }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { updateClassLearners, updateClassDetails } = useClasses();
  const {
    assessments,
    activeTerm,
    activeYear,
    marks,
    loading: academicLoading,
    refreshAssessments,
    hasPreloadedMarkSheetData
  } = useAcademic();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo } = useSettings();
  const isLocked = !!activeTerm?.closed || !!classInfo.is_finalised;

  const [diagOpen, setDiagOpen] = useState(false);
  const [isMarkSheetUpdating, setIsMarkSheetUpdating] = useState(false);
  const marksheetRequestRef = useRef(0);

  const {
    learners,
    setLearners,
    hasUnsavedChanges,
    handleMarkChange,
    handleCommentChange,
    handleRenameLearner,
    handleRemoveLearner,
    handleBatchDelete,
    handleBatchComment,
    handleBatchClearMarks,
    handleUpdateLearners,
    handleSaveChanges
  } = useLearnerState(classInfo, updateClassLearners, isLocked);

  const {
    isGeneratingInsights,
    insights,
    handleGenerateInsights,
    handleSimulateInsights,
    showComments,
    isGeneratingComments,
    handleGenerateComments,
  } = useAiFeatures(classInfo, learners, setLearners);

  const dialogs = useClassDialogs();

  const {
    handleShareSummary,
    handleExportCsv,
    handleExportPdf,
    handleExportBulkPdf,
    handleExportBlankPdf
  } = useClassExport(
      classInfo, 
      learners, 
      gradingScheme, 
      schoolName, 
      teacherName, 
      schoolLogo,
      activeTerm,
      assessments,
      marks
  );

  const hasCachedMarkSheetData = useMemo(() => {
    if (!activeTerm?.id) return false;
    const hasContextData = assessments.some(a => a.class_id === classId && a.term_id === activeTerm.id);
    return hasContextData || hasPreloadedMarkSheetData(classId, activeTerm.id);
  }, [classId, activeTerm?.id, assessments, hasPreloadedMarkSheetData]);

  const fetchInsights = () => fetchClassInsights(classId, activeTerm?.id, activeYear?.id);

  const fetchReports = async () => ({ classId, ready: true });

  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ["insights", classId], queryFn: fetchInsights });
    queryClient.prefetchQuery({ queryKey: ["reports", classId], queryFn: fetchReports });
  }, [classId, activeTerm?.id, activeYear?.id, queryClient]);

  useEffect(() => {
    setIsMarkSheetUpdating(false);
    marksheetRequestRef.current += 1;
  }, []);

  useEffect(() => {
    setIsMarkSheetUpdating(false);
    marksheetRequestRef.current += 1;
  }, [classId]);

  useEffect(() => {
      if (!activeTerm?.id) {
        setIsMarkSheetUpdating(false);
        marksheetRequestRef.current += 1;
        return;
      }

      let isCancelled = false;
      const requestId = ++marksheetRequestRef.current;
      const timeoutId = setTimeout(() => {
        if (!isCancelled && requestId === marksheetRequestRef.current) {
          setIsMarkSheetUpdating(false);
          console.warn("[marksheet] forced reset after timeout");
        }
      }, 10000);

      const runRefresh = async () => {
        setIsMarkSheetUpdating(true);

        try {
          // Align React Query filter only; assessments/marks load via AcademicContext queries.
          // Avoid forceRefresh here — it duplicated preloadMarkSheetData + churned when cache appeared.
          await refreshAssessments(classId, activeTerm.id, false);
          if (requestId !== marksheetRequestRef.current) return;
        } catch (err) {
          console.error("[marksheet update failed]", err);
        } finally {
          clearTimeout(timeoutId);
          if (!isCancelled && requestId === marksheetRequestRef.current) {
            setIsMarkSheetUpdating(false);
          }
        }
      };

      void runRefresh();

      return () => {
        isCancelled = true;
        clearTimeout(timeoutId);
        if (requestId === marksheetRequestRef.current) {
          setIsMarkSheetUpdating(false);
        }
      };
  }, [classId, activeTerm?.id, refreshAssessments]);

  useEffect(() => {
    document.title = `${classInfo.className} | AdminLess`;
  }, [classInfo]);

  const handleSASAMSExportAction = () => {
      if (!activeTerm || !activeYear) return;
      if (!classInfo.is_finalised && !activeTerm.closed) {
          showError("Export Blocked: Class must be finalised before SA-SAMS export.");
          return;
      }
      if (hasUnsavedChanges) {
          showError("Export Blocked: You have unsaved changes. Please save your work before exporting.");
          return;
      }
      
      generateSASAMSExport(
          learners, classInfo.className, classInfo.grade, classInfo.subject, 
          activeTerm.name, activeYear.name, teacherName, schoolCode
      );
  };

  if (!activeTerm) {
      return <div className="p-8 text-center text-muted-foreground">Academic term not selected. Please select a term in the header.</div>;
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 w-full max-w-7xl space-y-6 pb-20 relative animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 w-full">
        <ClassHeader 
            classInfo={classInfo}
            onBack={() => navigate('/classes')}
            onEdit={(details) => updateClassDetails(classInfo.id, details)}
            onSave={handleSaveChanges}
            onDialogs={{
                import: () => dialogs.setIsImportOpen(true),
                voice: () => dialogs.setIsVoiceEntryOpen(true),
                rapid: () => dialogs.setIsRapidEntryOpen(true),
                editLearners: () => dialogs.setIsEditLearnersOpen(true),
                aiInsights: () => dialogs.setIsAiInsightsOpen(true),
                moderation: () => dialogs.setIsModerationOpen(true),
                classroomTools: () => dialogs.setIsClassroomToolsOpen(true)
            }}
        />
      </div>

      <Tabs defaultValue="assessments" className="w-full max-w-full">
        <TabsList className="flex items-center justify-start w-full h-auto min-h-[48px] bg-muted/50 border p-1 overflow-x-auto no-scrollbar gap-1 rounded-xl flex-nowrap">
          <TabsTrigger value="assessments" className="flex-none shrink-0 h-10 px-4 sm:px-6 rounded-lg font-bold text-xs sm:text-sm">Assessments</TabsTrigger>
          <TabsTrigger value="capture" className="flex-none shrink-0 h-10 px-4 sm:px-6 gap-2 rounded-lg font-bold text-xs sm:text-sm">
            <Camera className="h-3.5 w-3.5" /> Capture
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex-none shrink-0 h-10 px-4 sm:px-6 gap-2 rounded-lg font-bold text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Insights
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex-none shrink-0 h-10 px-4 sm:px-6 gap-2 rounded-lg font-bold text-xs sm:text-sm">
            <ShieldCheck className="h-3.5 w-3.5" /> Evidence
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-none shrink-0 h-10 px-4 sm:px-6 gap-2 rounded-lg font-bold text-xs sm:text-sm">
            <FileDown className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex-none shrink-0 h-10 px-4 sm:px-6 rounded-lg font-bold text-xs sm:text-sm">Register</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments" className="mt-4">
            <MarkSheet 
                classInfo={classInfo} 
                isLoading={academicLoading && !hasCachedMarkSheetData}
                isRefreshing={isMarkSheetUpdating}
                onViewLearnerProfile={(l) => dialogs.setSelectedProfileLearner(l)}
            />
        </TabsContent>

        <TabsContent value="capture" className="mt-4">
           <Scan embedded defaultClassId={classInfo.id} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
             <ClassAnalysisTab 
               classId={classId!} 
               termId={activeTerm?.id} 
               learners={learners} 
             />
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-8">
             <div className="max-w-2xl mx-auto w-full">
                <EvidenceManager 
                    classId={classId!} 
                    termId={activeTerm?.id}
                    isLocked={isLocked} 
                />
             </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-8">
             <ClassReportsTab 
               classInfo={classInfo}
               isLocked={isLocked}
               onExportPdf={handleExportPdf}
               onExportCsv={handleExportCsv}
               onExportBulkPdf={handleExportBulkPdf}
               onExportBlankList={handleExportBlankPdf}
               onShare={handleShareSummary}
               onSasams={handleSASAMSExportAction}
               onOpenDiagnostic={() => setDiagOpen(true)}
             />
        </TabsContent>
        
        <TabsContent value="attendance" className="mt-4">
           <AttendanceView classId={classInfo.id} learners={learners} isLocked={isLocked} />
        </TabsContent>
      </Tabs>

      {classInfo && activeTerm && activeYear && (
          <DiagnosticReportDialog 
            open={diagOpen}
            onOpenChange={setDiagOpen}
            classInfo={classInfo}
            term={activeTerm}
            year={activeYear}
          />
      )}

      <ClassDialogsManager
        dialogs={dialogs}
        classInfo={classInfo}
        learners={learners}
        handlers={{
            handleAddLearners: () => {}, 
            handleUpdateLearners,
            handleMarkChange
        }}
        aiFeatures={{
            isGeneratingInsights,
            insights,
            handleGenerateInsights,
            handleSimulateInsights
        }}
      />
    </div>
  );
};

const ClassDetails = () => <ClassDetailsContent />;

export default ClassDetails;