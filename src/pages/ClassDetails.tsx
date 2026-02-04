import { useParams, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassHeader } from "@/components/ClassHeader";
import { MarksTab } from "@/components/MarksTab";
import { MarkSheet } from "@/components/assessments/MarkSheet"; 
import { AttendanceView } from "@/components/AttendanceView";
import { ClassDialogsManager } from "@/components/ClassDialogsManager";
import { EvidenceManager } from "@/components/evidence/EvidenceManager";
import { ClassAnalysisTab } from "@/components/analysis/ClassAnalysisTab";
import { useLearnerState } from "@/hooks/useLearnerState";
import { useAiFeatures } from "@/hooks/useAiFeatures";
import { useClassExport } from "@/hooks/useClassExport";
import { useClassDialogs } from "@/hooks/useClassDialogs";
import { Loader2, ShieldCheck, BarChart3 } from "lucide-react";

const ClassDetails = () => {
  const { classId } = useParams();
  const location = useLocation();
  const { classes, loading: classesLoading, updateClassLearners, updateClassDetails } = useClasses();
  const { assessments, activeTerm } = useAcademic();
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  
  const classInfo = classes.find((c) => c.id === classId);
  
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!classId || !classInfo) {
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
        <TabsList className="grid w-full grid-cols-2 lg:w-[600px]">
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Analysis
          </TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Evidence
          </TabsTrigger>
          {!hasAssessments && <TabsTrigger value="legacy">Legacy Marks</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="assessments">
             <MarkSheet 
               classInfo={classInfo} 
               onViewLearnerProfile={(l) => dialogs.setSelectedProfileLearner(l)}
             />
        </TabsContent>

        <TabsContent value="analysis">
             <ClassAnalysisTab 
               classId={classId} 
               termId={activeTerm?.id} 
               learners={learners} 
             />
        </TabsContent>

        <TabsContent value="evidence">
             <div className="max-w-2xl mx-auto mt-6">
                <EvidenceManager 
                    classId={classId} 
                    termId={activeTerm?.id}
                    isLocked={activeTerm?.closed} 
                />
             </div>
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