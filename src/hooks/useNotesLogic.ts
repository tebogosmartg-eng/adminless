import { useState } from "react";
import { LearnerNote } from "@/lib/types";
import { showError } from "@/utils/toast";
import { useAcademic } from "@/context/AcademicContext";

export interface AlertWithLearner extends LearnerNote {
  learnerName: string;
  className: string;
  classId?: string;
}

export const useNotesLogic = () => {
  const { activeYear, activeTerm } = useAcademic();

  const [recentAlerts, setRecentAlerts] = useState<AlertWithLearner[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Temporary safe state during migration away from Dexie.
  // Keep the same hook API while preventing runtime fetches/crashes.
  void setRecentAlerts;
  void setLoadingAlerts;
  void activeTerm;

  // Temporary safe implementation during migration.
  const addNoteGlobal = async (
    learnerId: string,
    content: string,
    category: LearnerNote["category"],
    date: string
  ) => {
    if (!activeYear || !activeTerm) {
      showError(
        "Note creation blocked: Please select an active Academic Cycle first."
      );
      return false;
    }

    void learnerId;
    void content;
    void category;
    void date;
    showError("Global note saving is temporarily unavailable.");
    return false;
  };

  return { recentAlerts, loadingAlerts, addNoteGlobal };
};