import { useState } from 'react';
import { Learner } from '@/lib/types';

export const useClassDialogs = () => {
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isRapidEntryOpen, setIsRapidEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditLearnersOpen, setIsEditLearnersOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [isClassroomToolsOpen, setIsClassroomToolsOpen] = useState(false);
  const [selectedProfileLearner, setSelectedProfileLearner] = useState<Learner | null>(null);

  return {
    isVoiceEntryOpen, setIsVoiceEntryOpen,
    isRapidEntryOpen, setIsRapidEntryOpen,
    isImportOpen, setIsImportOpen,
    isEditLearnersOpen, setIsEditLearnersOpen,
    isAiInsightsOpen, setIsAiInsightsOpen,
    isAddLearnerOpen, setIsAddLearnerOpen,
    isModerationOpen, setIsModerationOpen,
    isClassroomToolsOpen, setIsClassroomToolsOpen,
    selectedProfileLearner, setSelectedProfileLearner
  };
};