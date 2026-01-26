import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClassInfo, Learner } from "@/lib/types";
import { useClasses } from "@/context/ClassesContext";
import { showSuccess } from "@/utils/toast";

interface EditLearnersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  classInfo: ClassInfo | null;
}

export const EditLearnersDialog = ({ isOpen, onOpenChange, classInfo }: EditLearnersDialogProps) => {
  const { updateClassLearners } = useClasses();
  const [learnersText, setLearnersText] = useState("");

  useEffect(() => {
    if (classInfo) {
      const text = classInfo.learners.map(l => l.name).join('\n');
      setLearnersText(text);
    }
  }, [classInfo]);

  const handleSubmit = () => {
    if (!classInfo) return;

    const newLearnerNames = learnersText.split('\n').map(name => name.trim()).filter(name => name !== '');
    
    const updatedLearners: Learner[] = newLearnerNames.map(newName => {
      const existingLearner = classInfo.learners.find(oldLearner => oldLearner.name.toLowerCase() === newName.toLowerCase());
      return {
        name: newName,
        mark: existingLearner ? existingLearner.mark : '',
      };
    });

    updateClassLearners(classInfo.id, updatedLearners);
    showSuccess("Learner list has been updated successfully.");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Learners</DialogTitle>
          <DialogDescription>
            Add, edit, or remove learners from this class. One name per line.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="learners-list">Learner Names</Label>
          <Textarea
            id="learners-list"
            value={learnersText}
            onChange={(e) => setLearnersText(e.target.value)}
            placeholder="Enter one learner name per line..."
            rows={10}
          />
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};