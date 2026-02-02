import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassHeader } from "@/components/ClassHeader";
import { MarksTab } from "@/components/MarksTab";
import { MarkSheet } from "@/components/assessments/MarkSheet"; 
import { AttendanceView } from "@/components/AttendanceView";
import { ClassDialogsManager } from "@/components/ClassDialogsManager";
import { useLearnerState } from "@/hooks/useLearnerState";
import { useAiFeatures } from "@/hooks/useAiFeatures";
import { useClassExport } from "@/hooks/useClassExport";
import { useClassDialogs } from "@/hooks/useClassDialogs";
import { Loader2 } from "lucide-react";

const ClassDetails = () => {
  const { classId } = useParams();
  const location = useLocation();
  const { classes, loading: classesLoading, updateClassLearners, updateClassDetails } = useClasses();
  const { assessments } = useAcademic();
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  
  const classInfo = classes.find((c) => c.id === classId);
  
  // Cognitive Load Fix: If assessments exist, "Legacy" is just a distraction
  const hasAssessments = assessments.length > 0;

  const {
    learners,
    setLearners,
    handleMarkChange,
    handleCommentChange,
    handleRenameLearner,
    handleRemoveLearner,
    handleBatchDelete,
    handleBatchComment,
    handleBatchClearMarks,
    handleAddLearners,
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
  } = useClassExport(classInfo, learners, gradingScheme, schoolName, teacherName, schoolLogo);

  useEffect(() => {
    if (classInfo) {
      document.title = `${classInfo.className} | SmaReg`;
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
  }, [location.state, learners]);

  if (classesLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!classInfo) {
    return <div className="p-8 text-center text-muted-foreground">Class not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 pb-20">
      <ClassHeader 
        classInfo={classInfo}
        onBack={() => window.history.back()}
        onEdit={(details) => updateClassDetails(classInfo.id, details)}
        onSave={handleSaveChanges}
        onExport={{
            csv: handleExportCsv,
            pdf: handleExportPdf,
            bulkPdf: handleExportBulkPdf,
            blankList: handleExportBlankPdf,
            share: handleShareSummary
        }}
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

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {/* Legacy is hidden if using assessments system to reduce noise */}
          {!hasAssessments && <TabsTrigger value="legacy">Legacy Marks</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="assessments">
             <MarkSheet 
               classInfo={classInfo} 
               onViewLearnerProfile={(l) => dialogs.setSelectedProfileLearner(l)}
             />
        </TabsContent>

        <TabsContent value="legacy">
           <MarksTab 
             learners={learners}
             showComments={showComments}
             gradingScheme={gradingScheme}
             isGeneratingComments={isGeneratingComments}
             classId={classInfo.id}
             notes={classInfo.notes || ''}
             onGenerateComments={handleGenerateComments}
             onMarkChange={handleMarkChange}
             onCommentChange={handleCommentChange}
             onRenameLearner={handleRenameLearner}
             onRemoveLearner={handleRemoveLearner}
             onProfileClick={(l) => dialogs.setSelectedProfileLearner(l)}
             onAddLearnerClick={() => dialogs.setIsAddLearnerOpen(true)}
             onBatchDelete={handleBatchDelete}
             onBatchComment={handleBatchComment}
             onBatchClearMarks={handleBatchClearMarks}
           />
        </TabsContent>
        
        <TabsContent value="attendance">
           <AttendanceView classId={classInfo.id} learners={learners} />
        </TabsContent>
      </Tabs>

      <ClassDialogsManager
        dialogs={dialogs}
        classInfo={classInfo}
        learners={learners}
        handlers={{
            handleAddLearners,
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