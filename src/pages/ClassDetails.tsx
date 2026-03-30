import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
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
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ShieldCheck, 
  BarChart3, 
  ArrowLeft, 
  Sparkles, 
  Dices, 
  FileDown,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showError } from "@/utils/toast";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { generateSASAMSExport } from "@/utils/sasams";

import Scan from "@/pages/Scan";
import EvidenceAudit from "@/pages/EvidenceAudit";
import ScanAudit from "@/pages/ScanAudit";
import Reports from "@/pages/Reports";

const ClassDetailsContent = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { classes, loading: classesLoading, updateClassLearners, updateClassDetails } = useClasses();
  const { assessments, activeTerm, activeYear, marks, loading: academicLoading, refreshAssessments } = useAcademic();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo } = useSettings();
  
  const classInfo = classes.find((c) => c.id === classId);
  const isLocked = !!activeTerm?.closed || !!classInfo?.is_finalised;

  const [diagOpen, setDiagOpen] = useState(false);

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
  } = useLearnerState(classInfo, updateClassLearners);

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

  useEffect(() => {
      if (classId && activeTerm?.id) {
          refreshAssessments(classId, activeTerm.id);
      }
  }, [classId, activeTerm?.id, refreshAssessments]);

  useEffect(() => {
    if (classInfo) {
      document.title = `${classInfo.className} | AdminLess`;
    }
  }, [classInfo]);

  const handleSASAMSExportAction = () => {
      if (!classInfo || !activeTerm || !activeYear) return;
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

  if (classesLoading || academicLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  if (!classId || !classInfo) {
    return <div className="p-8 text-center text-muted-foreground">Class not found.</div>;
  }

  if (!activeTerm) {
      return <div className="p-8 text-center text-muted-foreground">Academic term not selected. Please select a term in the header.</div>;
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 w-full max-w-7xl space-y-6 pb-20 relative animate-in fade-in duration-700">
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
        <TabsList className="flex items-center justify-start w-full h-auto min-h-12 bg-muted/50 border p-1 overflow-x-auto no-scrollbar gap-1 rounded-xl flex-nowrap">
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
           <AttendanceView classId={classInfo.id} learners={learners} />
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

const ClassDetails = () => {
  const { user, authReady } = useAuthGuard();

  if (!authReady || !user) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return <ClassDetailsContent />;
};

export default ClassDetails;