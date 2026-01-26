import { VoiceEntryDialog } from '@/components/dialogs/VoiceEntryDialog';
import { RapidEntryDialog } from '@/components/dialogs/RapidEntryDialog';
import { ImportMarksDialog } from '@/components/dialogs/ImportMarksDialog';
import { EditLearnersDialog } from '@/components/dialogs/EditLearnersDialog';
import { AiInsightsDialog } from '@/components/dialogs/AiInsightsDialog';
import { AddLearnerDialog } from '@/components/dialogs/AddLearnerDialog';
import { ModerationToolsDialog } from '@/components/dialogs/ModerationToolsDialog';
import { LearnerProfileDialog } from '@/components/dialogs/LearnerProfileDialog';
import { Learner, ClassInfo } from '@/lib/types';
import { ClassInsight } from '@/services/gemini';

interface ClassDialogsManagerProps {
  classInfo: ClassInfo;
  learners: Learner[];
  classAverage: number;
  
  // Dialog States
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
  selectedProfileLearner: Learner | null;
  setSelectedProfileLearner: (learner: Learner | null) => void;

  // AI Data
  isGeneratingInsights: boolean;
  insights: ClassInsight | null;

  // Handlers
  onUpdateLearners: (learners: Learner[]) => void;
  onAddLearners: (names: string[]) => void;
  onGenerateInsights: () => void;
  onSimulateInsights: () => void;
}

export const ClassDialogsManager = ({
  classInfo,
  learners,
  classAverage,
  isVoiceEntryOpen, setIsVoiceEntryOpen,
  isRapidEntryOpen, setIsRapidEntryOpen,
  isImportOpen, setIsImportOpen,
  isEditLearnersOpen, setIsEditLearnersOpen,
  isAiInsightsOpen, setIsAiInsightsOpen,
  isAddLearnerOpen, setIsAddLearnerOpen,
  isModerationOpen, setIsModerationOpen,
  selectedProfileLearner, setSelectedProfileLearner,
  isGeneratingInsights,
  insights,
  onUpdateLearners,
  onAddLearners,
  onGenerateInsights,
  onSimulateInsights
}: ClassDialogsManagerProps) => {
  return (
    <>
      <AddLearnerDialog 
        isOpen={isAddLearnerOpen}
        onOpenChange={setIsAddLearnerOpen}
        onAdd={onAddLearners}
      />
      
      <VoiceEntryDialog 
        isOpen={isVoiceEntryOpen}
        onOpenChange={setIsVoiceEntryOpen}
        learners={learners}
        onComplete={onUpdateLearners}
      />
      
      <RapidEntryDialog 
        isOpen={isRapidEntryOpen}
        onOpenChange={setIsRapidEntryOpen}
        learners={learners}
        onComplete={onUpdateLearners}
      />

      <ImportMarksDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        classInfo={classInfo}
        onImportComplete={onUpdateLearners}
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
        onGenerate={onGenerateInsights}
        onSimulate={onSimulateInsights}
      />
      
      <ModerationToolsDialog 
        isOpen={isModerationOpen}
        onOpenChange={setIsModerationOpen}
        learners={learners}
        classAverage={classAverage}
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