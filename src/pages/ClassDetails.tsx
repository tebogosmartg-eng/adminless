import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Button } from '@/components/ui/button';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';
import { VoiceEntryDialog } from '@/components/VoiceEntryDialog';
import { ImportMarksDialog } from '@/components/ImportMarksDialog';
import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/MarkDistributionChart';
import { EditLearnersDialog } from '@/components/EditLearnersDialog';
import { AiInsightsDialog } from '@/components/AiInsightsDialog';
import { generateClassInsights, generateReportComments, ClassInsight } from '@/services/gemini';
import { getGradeSymbol } from '@/utils/grading';
import { useSettings } from '@/context/SettingsContext';
import { LearnerProfileDialog } from '@/components/LearnerProfileDialog';
import { ClassHeader } from '@/components/ClassHeader';
import { LearnerList } from '@/components/LearnerList';
import { AddLearnerDialog } from '@/components/AddLearnerDialog';
import { generateClassPDF, generateBlankClassListPDF } from '@/utils/pdfGenerator';

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const { gradingScheme, schoolName, teacherName } = useSettings();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditLearnersOpen, setIsEditLearnersOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  
  // Profile View State
  const [selectedProfileLearner, setSelectedProfileLearner] = useState<Learner | null>(null);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // AI Insights State
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<ClassInsight | null>(null);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setLearners(classInfo.learners);
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo) {
      const original = JSON.stringify(classInfo.learners);
      const current = JSON.stringify(learners);
      setHasUnsavedChanges(original !== current);
    }
  }, [learners, classInfo]);

  const handleMarkChange = (index: number, mark: string) => {
    const updatedLearners = [...learners];
    updatedLearners[index] = { ...updatedLearners[index], mark };
    setLearners(updatedLearners);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updatedLearners = [...learners];
    updatedLearners[index] = { ...updatedLearners[index], comment };
    setLearners(updatedLearners);
  };
  
  const handleRemoveLearner = (index: number) => {
    if (confirm("Are you sure you want to remove this learner?")) {
      const updatedLearners = learners.filter((_, i) => i !== index);
      setLearners(updatedLearners);
    }
  };

  const handleAddLearner = (name: string) => {
    setLearners([...learners, { name, mark: "" }]);
    showSuccess("Learner added to the list. Remember to save changes.");
  };

  const handleSaveChanges = () => {
    if (classId) {
      updateLearners(classId, learners);
      showSuccess("Changes have been saved successfully!");
      setInsights(null); 
    }
  };
  
  const handleClearMarks = () => {
    if (confirm("Are you sure you want to clear ALL marks and comments? This cannot be undone once saved.")) {
      const cleared = learners.map(l => ({ ...l, mark: "", comment: "" }));
      setLearners(cleared);
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

  const handleExportCsv = () => {
    if (!classInfo) {
      showError("Could not find class information to export.");
      return;
    }

    const csvHeader = "Learner Name,Mark,Symbol,Level,Comment\n";
    const csvRows = learners
      .map(learner => {
        const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
        const symbol = gradeSymbol?.symbol || '';
        const level = gradeSymbol?.level || '';
        return `"${learner.name.replace(/"/g, '""')}",${learner.mark},${symbol},${level},"${(learner.comment || '').replace(/"/g, '""')}"`;
      })
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `${classInfo.grade}_${classInfo.subject}_${classInfo.className}_Marks.csv`.replace(/\s+/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("CSV exported successfully!");
    } else {
      showError("Export feature is not supported in your browser.");
    }
  };

  const handleExportPdf = () => {
    if (!classInfo) return;
    try {
      const exportClassInfo = { ...classInfo, learners };
      generateClassPDF(exportClassInfo, gradingScheme, schoolName, teacherName);
      showSuccess("PDF Report generated successfully!");
    } catch (error) {
      console.error(error);
      showError("Failed to generate PDF. Please try again.");
    }
  };
  
  const handleExportBlankPdf = () => {
    if (!classInfo) return;
    try {
      const exportClassInfo = { ...classInfo, learners };
      generateBlankClassListPDF(exportClassInfo, schoolName, teacherName);
      showSuccess("Blank class list generated!");
    } catch (error) {
      console.error(error);
      showError("Failed to generate PDF.");
    }
  };

  const handleGenerateInsights = async () => {
    if (!classInfo) return;
    
    const hasMarks = learners.some(l => l.mark && l.mark.trim() !== "");
    if (!hasMarks) {
      showError("Please enter some marks before generating insights.");
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const result = await generateClassInsights(classInfo.subject, classInfo.grade, learners);
      setInsights(result);
    } catch (error) {
      console.error(error);
      showError("Failed to generate insights. Check API Key in settings.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateComments = async () => {
    if (!classInfo) return;
    
    const hasMarks = learners.some(l => l.mark && l.mark.trim() !== "");
    if (!hasMarks) {
      showError("Please enter marks before generating comments.");
      return;
    }

    setIsGeneratingComments(true);
    setShowComments(true);
    
    try {
      const comments = await generateReportComments(classInfo.subject, classInfo.grade, learners);
      
      const updatedLearners = learners.map(learner => {
        const generated = comments.find(c => c.name === learner.name);
        if (generated) {
          return { ...learner, comment: generated.comment };
        }
        return learner;
      });

      setLearners(updatedLearners);
      showSuccess(`Generated comments for ${comments.length} learners.`);
    } catch (error) {
      console.error(error);
      showError("Failed to generate comments. Check API Key in settings.");
    } finally {
      setIsGeneratingComments(false);
    }
  };

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Class not found</h2>
        <p className="text-muted-foreground mt-2">The class you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link to="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ClassHeader 
        classNameStr={classInfo.className}
        subject={classInfo.subject}
        grade={classInfo.grade}
        hasUnsavedChanges={hasUnsavedChanges}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        onSave={handleSaveChanges}
        onOpenAiInsights={() => setIsAiInsightsOpen(true)}
        onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
        onOpenAddLearner={() => setIsAddLearnerOpen(true)}
        onOpenEditLearners={() => setIsEditLearnersOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportBlankPdf={handleExportBlankPdf}
        onClearMarks={handleClearMarks}
      />

      {!showComments && (
        <>
          <ClassStats learners={learners} />
          <MarkDistributionChart learners={learners} />
        </>
      )}

      <LearnerList
        learners={learners}
        showComments={showComments}
        gradingScheme={gradingScheme}
        isGeneratingComments={isGeneratingComments}
        onGenerateComments={handleGenerateComments}
        onMarkChange={handleMarkChange}
        onCommentChange={handleCommentChange}
        onRemoveLearner={handleRemoveLearner}
        onProfileClick={setSelectedProfileLearner}
        onAddLearnerClick={() => setIsAddLearnerOpen(true)}
      />
      
      <AddLearnerDialog 
        isOpen={isAddLearnerOpen}
        onOpenChange={setIsAddLearnerOpen}
        onAdd={handleAddLearner}
      />
      
      <VoiceEntryDialog 
        isOpen={isVoiceEntryOpen}
        onOpenChange={setIsVoiceEntryOpen}
        learners={learners}
        onComplete={handleUpdateAndSaveLearners}
      />
      <ImportMarksDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        classInfo={classInfo}
        onImportComplete={handleUpdateAndSaveLearners}
      />
      <EditLearnersDialog
        isOpen={isEditLearnersOpen}
        onOpenChange={setIsEditLearnersOpen}
        classInfo={classInfo}
      />
      <AiInsightsDialog
        isOpen={isAiInsightsOpen}
        onOpenChange={setIsAiInsightsOpen}
        isLoading={isGeneratingInsights}
        insights={insights}
        onGenerate={handleGenerateInsights}
      />
      <LearnerProfileDialog
        isOpen={!!selectedProfileLearner}
        onOpenChange={(open) => !open && setSelectedProfileLearner(null)}
        learner={selectedProfileLearner}
        classSubject={`${classInfo.grade} ${classInfo.subject}`}
      />
    </>
  );
};

export default ClassDetails;