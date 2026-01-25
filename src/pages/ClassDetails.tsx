import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Button } from '@/components/ui/button';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';
import { generateClassInsights, generateReportComments, ClassInsight, getMockClassInsights, getMockReportComments } from '@/services/gemini';
import { useSettings } from '@/context/SettingsContext';
import { ClassHeader } from '@/components/ClassHeader';
import confetti from 'canvas-confetti';
import { calculateClassStats } from '@/utils/stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceView } from '@/components/AttendanceView';
import { ListChecks, CalendarDays } from 'lucide-react';
import { MarksTab } from '@/components/MarksTab';
import { ClassDialogsManager } from '@/components/ClassDialogsManager';
import { useClassExport } from '@/hooks/useClassExport';

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);
  
  // Dialog State
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isRapidEntryOpen, setIsRapidEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditLearnersOpen, setIsEditLearnersOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [selectedProfileLearner, setSelectedProfileLearner] = useState<Learner | null>(null);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [prevGradedCount, setPrevGradedCount] = useState(0);

  // AI & Comments State
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<ClassInsight | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  // View Mode
  const [activeTab, setActiveTab] = useState("marks");

  // Hook for Exports
  const { 
    handleShareSummary,
    handleExportCsv,
    handleExportPdf,
    handleExportBulkPdf,
    handleExportBlankPdf
  } = useClassExport(classInfo, learners, gradingScheme, schoolName, teacherName, schoolLogo);

  useEffect(() => {
    if (classInfo) {
      setLearners(classInfo.learners);
      const count = classInfo.learners.filter(l => l.mark && l.mark.trim() !== '').length;
      setPrevGradedCount(count);
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo) {
      const original = JSON.stringify(classInfo.learners);
      const current = JSON.stringify(learners);
      setHasUnsavedChanges(original !== current);
      
      const currentGradedCount = learners.filter(l => l.mark && l.mark.trim() !== '').length;
      if (learners.length > 0 && currentGradedCount === learners.length && currentGradedCount > prevGradedCount) {
        triggerConfetti();
      }
      setPrevGradedCount(currentGradedCount);
    }
  }, [learners, classInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) handleSaveChanges();
        else showSuccess("No changes to save.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [learners, hasUnsavedChanges]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleMarkChange = (index: number, mark: string) => {
    const updated = [...learners];
    updated[index] = { ...updated[index], mark };
    setLearners(updated);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updated = [...learners];
    updated[index] = { ...updated[index], comment };
    setLearners(updated);
  };
  
  const handleRemoveLearner = (index: number) => {
    if (confirm("Are you sure you want to remove this learner?")) {
      setLearners(learners.filter((_, i) => i !== index));
    }
  };

  const handleBatchDelete = (indices: number[]) => {
    setLearners(learners.filter((_, i) => !indices.includes(i)));
    showSuccess(`Deleted ${indices.length} learners.`);
  };

  const handleBatchComment = (indices: number[], comment: string) => {
    const updated = [...learners];
    indices.forEach(index => { if (updated[index]) updated[index] = { ...updated[index], comment }; });
    setLearners(updated);
    showSuccess(`Updated comments for ${indices.length} learners.`);
  };

  const handleBatchClearMarks = (indices: number[]) => {
    const updated = [...learners];
    indices.forEach(index => { if (updated[index]) updated[index] = { ...updated[index], mark: "" }; });
    setLearners(updated);
    showSuccess(`Cleared marks for ${indices.length} learners.`);
  };

  const handleAddLearners = (names: string[]) => {
    const newLearners = names.map(name => ({ name, mark: "" }));
    setLearners([...learners, ...newLearners]);
    showSuccess(`Added ${names.length} learner(s). Remember to save changes.`);
  };

  const handleSaveChanges = () => {
    if (classId) {
      updateLearners(classId, learners);
      showSuccess("Changes have been saved successfully!");
      setHasUnsavedChanges(false);
      setInsights(null); 
    }
  };
  
  const handleClearMarks = () => {
    if (confirm("Clear ALL marks and comments? This cannot be undone once saved.")) {
      setLearners(learners.map(l => ({ ...l, mark: "", comment: "" })));
      showSuccess("All marks cleared. Click 'Save Changes' to confirm.");
    }
  };

  const handleUpdateAndSaveLearners = (updatedLearners: Learner[]) => {
    setLearners(updatedLearners);
    if (classId) {
      updateLearners(classId, updatedLearners);
      setInsights(null);
    }
  };

  const handleGenerateInsights = async () => {
    if (!classInfo) return;
    if (!learners.some(l => l.mark && l.mark.trim() !== "")) {
      showError("Please enter some marks before generating insights.");
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const result = await generateClassInsights(classInfo.subject, classInfo.grade, learners);
      setInsights(result);
    } catch (error) {
      console.error(error);
      showError("Failed to generate insights.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSimulateInsights = () => {
    setIsGeneratingInsights(true);
    setTimeout(() => {
      setInsights(getMockClassInsights());
      setIsGeneratingInsights(false);
      showSuccess("Demo insights generated!");
    }, 1000);
  };

  const handleGenerateComments = async () => {
    if (!classInfo) return;
    if (!learners.some(l => l.mark && l.mark.trim() !== "")) {
      showError("Enter marks before generating comments.");
      return;
    }
    setIsGeneratingComments(true);
    setShowComments(true);
    try {
      const comments = await generateReportComments(classInfo.subject, classInfo.grade, learners);
      const updated = learners.map(l => {
        const gen = comments.find(c => c.name === l.name);
        return gen ? { ...l, comment: gen.comment } : l;
      });
      setLearners(updated);
      showSuccess(`Generated comments for ${comments.length} learners.`);
    } catch (error) {
      console.error(error);
      showError("Failed to generate comments.");
    } finally {
      setIsGeneratingComments(false);
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
        onSave={handleSaveChanges}
        onOpenAiInsights={() => setIsAiInsightsOpen(true)}
        onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
        onOpenRapidEntry={() => setIsRapidEntryOpen(true)}
        onOpenAddLearner={() => setIsAddLearnerOpen(true)}
        onOpenEditLearners={() => setIsEditLearnersOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportBlankPdf={handleExportBlankPdf}
        onExportBulkReports={handleExportBulkPdf}
        onClearMarks={handleClearMarks}
        onShare={handleShareSummary}
        onOpenModeration={() => setIsModerationOpen(true)}
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
              onProfileClick={setSelectedProfileLearner}
              onAddLearnerClick={() => setIsAddLearnerOpen(true)}
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
        isVoiceEntryOpen={isVoiceEntryOpen} setIsVoiceEntryOpen={setIsVoiceEntryOpen}
        isRapidEntryOpen={isRapidEntryOpen} setIsRapidEntryOpen={setIsRapidEntryOpen}
        isImportOpen={isImportOpen} setIsImportOpen={setIsImportOpen}
        isEditLearnersOpen={isEditLearnersOpen} setIsEditLearnersOpen={setIsEditLearnersOpen}
        isAiInsightsOpen={isAiInsightsOpen} setIsAiInsightsOpen={setIsAiInsightsOpen}
        isAddLearnerOpen={isAddLearnerOpen} setIsAddLearnerOpen={setIsAddLearnerOpen}
        isModerationOpen={isModerationOpen} setIsModerationOpen={setIsModerationOpen}
        selectedProfileLearner={selectedProfileLearner} setSelectedProfileLearner={setSelectedProfileLearner}
        isGeneratingInsights={isGeneratingInsights}
        insights={insights}
        onUpdateLearners={handleUpdateAndSaveLearners}
        onAddLearners={handleAddLearners}
        onGenerateInsights={handleGenerateInsights}
        onSimulateInsights={handleSimulateInsights}
      />
    </>
  );
};

export default ClassDetails;