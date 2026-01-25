import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Button } from '@/components/ui/button';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess } from '@/utils/toast';
import { useSettings } from '@/context/SettingsContext';
import { ClassHeader } from '@/components/ClassHeader';
import { calculateClassStats } from '@/utils/stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceView } from '@/components/AttendanceView';
import { ListChecks, CalendarDays } from 'lucide-react';
import { MarksTab } from '@/components/MarksTab';
import { ClassDialogsManager } from '@/components/ClassDialogsManager';
import { useClassExport } from '@/hooks/useClassExport';
import { useLearnerState } from '@/hooks/useLearnerState';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { useClassDialogs } from '@/hooks/useClassDialogs';

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  const classInfo = classes.find((c) => c.id === classId);

  // Custom Hooks for Logic
  const {
    learners,
    setLearners,
    hasUnsavedChanges,
    handleMarkChange,
    handleCommentChange,
    handleRemoveLearner,
    handleBatchDelete,
    handleBatchComment,
    handleBatchClearMarks,
    handleAddLearners,
    handleClearMarks,
    handleUpdateLearners,
    handleSaveChanges
  } = useLearnerState(classInfo, updateLearners);

  const {
    isGeneratingInsights,
    insights,
    setInsights,
    handleGenerateInsights,
    handleSimulateInsights,
    showComments,
    setShowComments,
    isGeneratingComments,
    handleGenerateComments
  } = useAiFeatures(classInfo, learners, setLearners);

  const { 
    handleShareSummary,
    handleExportCsv,
    handleExportPdf,
    handleExportBulkPdf,
    handleExportBlankPdf
  } = useClassExport(classInfo, learners, gradingScheme, schoolName, teacherName, schoolLogo);

  // Dialog State Hook
  const dialogs = useClassDialogs();

  const [activeTab, setActiveTab] = useState("marks");

  // Global Save Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSaveChanges();
          setInsights(null); // Clear outdated insights on save
        } else {
          showSuccess("No changes to save.");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSaveChanges, setInsights]);

  // Wrapper for update learners to also clear insights
  const handleUpdateAndClearInsights = (updated: Learner[]) => {
    handleUpdateLearners(updated);
    if (classId) {
        // We might want to auto-save here depending on preference, but for now just update local state
        // The dialogs typically pass the final state
        updateLearners(classId, updated); 
        setInsights(null);
    }
  };

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Class not found</h2>
        <Button asChild className="mt-4"><Link to="/classes">Back to Classes</Link></Button>
      </div>
    );
  }

  const gradedCount = learners.filter(l => l.mark && l.mark.trim() !== '').length;
  const currentStats = calculateClassStats(learners);

  return (
    <>
      <ClassHeader 
        classNameStr={classInfo.className}
        subject={classInfo.subject}
        grade={classInfo.grade}
        learnerCount={learners.length}
        gradedCount={gradedCount}
        hasUnsavedChanges={hasUnsavedChanges}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        onSave={() => { handleSaveChanges(); setInsights(null); }}
        onOpenAiInsights={() => dialogs.setIsAiInsightsOpen(true)}
        onOpenVoiceEntry={() => dialogs.setIsVoiceEntryOpen(true)}
        onOpenRapidEntry={() => dialogs.setIsRapidEntryOpen(true)}
        onOpenAddLearner={() => dialogs.setIsAddLearnerOpen(true)}
        onOpenEditLearners={() => dialogs.setIsEditLearnersOpen(true)}
        onOpenImport={() => dialogs.setIsImportOpen(true)}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportBlankPdf={handleExportBlankPdf}
        onExportBulkReports={handleExportBulkPdf}
        onClearMarks={handleClearMarks}
        onShare={handleShareSummary}
        onOpenModeration={() => dialogs.setIsModerationOpen(true)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
         <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="marks" className="flex items-center gap-2">
               <ListChecks className="h-4 w-4" /> Marks & Assessment
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
               <CalendarDays className="h-4 w-4" /> Attendance
            </TabsTrigger>
         </TabsList>

         <TabsContent value="marks">
            <MarksTab 
              learners={learners}
              showComments={showComments}
              gradingScheme={gradingScheme}
              isGeneratingComments={isGeneratingComments}
              classId={classInfo.id}
              notes={classInfo.notes || ""}
              onGenerateComments={handleGenerateComments}
              onMarkChange={handleMarkChange}
              onCommentChange={handleCommentChange}
              onRemoveLearner={handleRemoveLearner}
              onProfileClick={dialogs.setSelectedProfileLearner}
              onAddLearnerClick={() => dialogs.setIsAddLearnerOpen(true)}
              onBatchDelete={handleBatchDelete}
              onBatchComment={handleBatchComment}
              onBatchClearMarks={handleBatchClearMarks}
            />
         </TabsContent>

         <TabsContent value="attendance" className="mt-4">
            {classInfo.id && <AttendanceView classId={classInfo.id} learners={learners} />}
         </TabsContent>
      </Tabs>
      
      <ClassDialogsManager
        classInfo={classInfo}
        learners={learners}
        classAverage={currentStats.average}
        {...dialogs}
        isGeneratingInsights={isGeneratingInsights}
        insights={insights}
        onUpdateLearners={handleUpdateAndClearInsights}
        onAddLearners={handleAddLearners}
        onGenerateInsights={handleGenerateInsights}
        onSimulateInsights={handleSimulateInsights}
      />
    </>
  );
};

export default ClassDetails;