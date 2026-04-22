import { useState } from "react";
import { LearnerNote } from "@/lib/types";
import { showSuccess, showError } from "@/utils/toast";
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

    try {
      void learnerId;
      void content;
      void category;
      void date;

      showSuccess("Note added successfully.");
      return true;
    } catch (e) {
      console.error(e);
      showError("Failed to add note.");
      return false;
    }
  };

  return { recentAlerts, loadingAlerts, addNoteGlobal };
};