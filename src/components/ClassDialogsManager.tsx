import { ImportMarksDialog } from '@/components/dialogs/ImportMarksDialog';
import { VoiceEntryDialog } from '@/components/dialogs/VoiceEntryDialog';
import { RapidEntryDialog } from '@/components/dialogs/RapidEntryDialog';
import { EditLearnersDialog } from '@/components/dialogs/EditLearnersDialog';
import { AiInsightsDialog } from '@/components/dialogs/AiInsightsDialog';
import { ModerationToolsDialog } from '@/components/dialogs/ModerationToolsDialog';
import { LearnerProfileDialog } from '@/components/dialogs/LearnerProfileDialog';
import { AddLearnerDialog } from '@/components/dialogs/AddLearnerDialog';
import { ClassroomToolsDialog } from '@/components/dialogs/ClassroomToolsDialog';
import { ClassInfo, Learner, ClassInsight } from '@/lib/types';

interface ClassDialogsManagerProps {
  dialogs: {
    isVoiceEntryOpen: boolean;
    setIsVoiceEntryOpen: (open: boolean) => void;
    isRapidEntryOpen: boolean;
    setIsRapidEntryOpen: (open: boolean) => void;
    isImportOpen: boolean;
    setIsImportOpen: (open: boolean) => void;
    isEditLearnersOpen: boolean;
    setIsEditLearnersOpen: (open: boolean) => void;
    isAiInsightsOpen: boolean;
    setIsAiInsightsOpen: (open: boolean) => void;
    isAddLearnerOpen: boolean;
    setIsAddLearnerOpen: (open: boolean) => void;
    isModerationOpen: boolean;
    setIsModerationOpen: (open: boolean) => void;
    isClassroomToolsOpen: boolean;
    setIsClassroomToolsOpen: (open: boolean) => void;
    selectedProfileLearner: Learner | null;
    setSelectedProfileLearner: (learner: Learner | null) => void;
  };
  classInfo: ClassInfo | undefined;
  learners: Learner[];
  handlers: {
    handleAddLearners: (learners: Learner[]) => void;
    handleUpdateLearners: (learners: Learner[]) => void;
    handleMarkChange: (index: number, mark: string) => void;
  };
  aiFeatures: {
    isGeneratingInsights: boolean;
    insights: ClassInsight | null;
    handleGenerateInsights: () => void;
    handleSimulateInsights: () => void;
  };
}

export const ClassDialogsManager = ({
  dialogs,
  classInfo,
  learners,
  handlers,
  aiFeatures
}: ClassDialogsManagerProps) => {

  const getCurrentLearnerIndex = () => {
    if (!dialogs.selectedProfileLearner) return -1;
    return learners.findIndex(l => l.name === dialogs.selectedProfileLearner?.name);
  };

  const currentIndex = getCurrentLearnerIndex();
  const hasNext = currentIndex < learners.length - 1 && currentIndex !== -1;
  const hasPrev = currentIndex > 0 && currentIndex !== -1;

  const handleNextLearner = () => {
    if (hasNext) {
      dialogs.setSelectedProfileLearner(learners[currentIndex + 1]);
    }
  };

  const handlePrevLearner = () => {
    if (hasPrev) {
      dialogs.setSelectedProfileLearner(learners[currentIndex - 1]);
    }
  };

  return (
    <>
      <ImportMarksDialog 
        open={dialogs.isImportOpen} 
        onOpenChange={dialogs.setIsImportOpen}
        onImport={(importedLearners) => {
          handlers.handleUpdateLearners([...learners, ...importedLearners]);
          dialogs.setIsImportOpen(false);
        }}
      />
      
      <VoiceEntryDialog 
        open={dialogs.isVoiceEntryOpen} 
        onOpenChange={dialogs.setIsVoiceEntryOpen}
        learners={learners}
        onUpdateMark={(index, mark) => handlers.handleMarkChange(index, mark)}
      />

      <RapidEntryDialog
        open={dialogs.isRapidEntryOpen}
        onOpenChange={dialogs.setIsRapidEntryOpen}
        learners={learners}
        onUpdateMark={(index, mark) => handlers.handleMarkChange(index, mark)}
      />

      <EditLearnersDialog 
        open={dialogs.isEditLearnersOpen} 
        onOpenChange={dialogs.setIsEditLearnersOpen}
        learners={learners}
        onUpdateLearners={handlers.handleUpdateLearners}
      />

      <AiInsightsDialog
        open={dialogs.isAiInsightsOpen}
        onOpenChange={dialogs.setIsAiInsightsOpen}
        classInfo={classInfo}
        learners={learners}
        insights={aiFeatures.insights}
        isLoading={aiFeatures.isGeneratingInsights}
        onGenerate={aiFeatures.handleGenerateInsights}
        onSimulate={aiFeatures.handleSimulateInsights}
      />

      <AddLearnerDialog
        open={dialogs.isAddLearnerOpen}
        onOpenChange={dialogs.setIsAddLearnerOpen}
        onAddLearners={handlers.handleAddLearners}
      />

      <ModerationToolsDialog
        open={dialogs.isModerationOpen}
        onOpenChange={dialogs.setIsModerationOpen}
        learners={learners}
        onUpdateLearners={handlers.handleUpdateLearners}
      />

      <ClassroomToolsDialog
        open={dialogs.isClassroomToolsOpen}
        onOpenChange={dialogs.setIsClassroomToolsOpen}
        learners={learners}
      />

      <LearnerProfileDialog 
        learner={dialogs.selectedProfileLearner} 
        open={!!dialogs.selectedProfileLearner}
        onOpenChange={(open) => !open && dialogs.setSelectedProfileLearner(null)}
        classSubject={classInfo?.subject || ''}
        onNext={handleNextLearner}
        onPrev={handlePrevLearner}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />
    </>
  );
};