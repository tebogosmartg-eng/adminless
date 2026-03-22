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
  FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { generateSASAMSExport } from "@/utils/sasams";
import { checkClassTermIntegrity } from "@/utils/integrity";
import { showError } from "@/utils/toast";

const ClassDetails = () => {
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { classes, loading: classesLoading, updateClassLearners, updateClassDetails } = useClasses();
  const { assessments, activeTerm, activeYear, marks } = useAcademic();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo } = useSettings();
  const { currentPeriod } = useCurrentPeriod();
  
  const highlightId = location.state?.highlightId;
  const isGuided = location.state?.fromOnboarding;

  const classInfo = classes.find((c) => c.id === classId);
  
  const isCurrentlyTeaching = currentPeriod?.class_id === classId;
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
      
      const termAssessments = assessments.filter(a => a.class_id === classInfo.id && a.term_id === activeTerm.id);
      const termMarks = marks.filter(m => termAssessments.some(a => a.id === m.assessment_id));

      const integrity = checkClassTermIntegrity(termAssessments, learners, termMarks);
      if (!integrity.isValid) {
          showError(`Export Blocked: ${integrity.errors[0]}`);
          return;
      }

      generateSASAMSExport(
          learners, classInfo.className, classInfo.grade, classInfo.subject, 
          activeTerm.name, activeYear.name, teacherName, schoolCode
      );
  };

  useEffect(() => {
    if (classInfo) {
      document.title = `${classInfo.className} | AdminLess`;
    }
  }, [classInfo]);

  useEffect(() => {
    if (location.state?.openLearnerId && learners.length > 0) {
        const targetId = location.state.openLearnerId;
        const learner = learners.find(l => l.id === targetId || l.name === targetId);
        if (learner) {
            dialogs.setSelectedProfileLearner(learner);
            window.history.replaceState({}, document.title);
        }
    }
  }, [location.state, learners, dialogs]);

  if (classesLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  if (!classId || !classInfo) {
    return <div className="p-8 text-center text-muted-foreground">Class not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 pb-20 relative animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        {isGuided && (
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2 border-primary text-primary hover:bg-primary/5">
                    <ArrowLeft className="h-4 w-4" /> Back to Checklist
                </Button>
            </div>
        )}
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

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList className="flex items-center justify-start w-full h-12 bg-muted/50 border p-1 overflow-x-auto no-scrollbar gap-1 rounded-xl">
          <TabsTrigger value="assessments" className="flex-none h-10 px-6 rounded-lg font-bold">Assessments</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-none h-10 px-6 rounded-lg font-bold">Register</TabsTrigger>
          <TabsTrigger value="analysis" className="flex-none h-10 px-6 gap-2 rounded-lg font-bold">
            <BarChart3 className="h-3.5 w-3.5" /> Analysis
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex-none h-10 px-6 gap-2 rounded-lg font-bold">
            <ShieldCheck className="h-3.5 w-3.5" /> Evidence
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-none h-10 px-6 gap-2 rounded-lg font-bold">
            <FileDown className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments" className="mt-4">
             <div className={cn(highlightId === 'new-task-btn' || highlightId === 'mark-sheet-grid' || highlightId === 'integrity-guard' ? "guide-highlight rounded-xl p-1" : "")}>
                <MarkSheet 
                    classInfo={classInfo} 
                    onViewLearnerProfile={(l) => dialogs.setSelectedProfileLearner(l)}
                />
             </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
           <AttendanceView classId={classInfo.id} learners={learners} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
             <ClassAnalysisTab 
               classId={classId!} 
               termId={activeTerm?.id} 
               learners={learners} 
             />
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
             <div className="max-w-2xl mx-auto">
                <EvidenceManager 
                    classId={classId!} 
                    termId={activeTerm?.id}
                    isLocked={isLocked} 
                />
             </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
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

      {isCurrentlyTeaching && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
              <Button 
                onClick={() => dialogs.setIsClassroomToolsOpen(true)} 
                size="lg" 
                className="rounded-full shadow-2xl bg-primary hover:bg-primary/90 px-6 h-14 border-4 border-white dark:border-background gap-3 group"
              >
                  <Dices className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Active Teaching</span>
                      <span className="text-sm font-bold">Classroom Tools</span>
                  </div>
                  <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
              </Button>
          </div>
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

export default ClassDetails;