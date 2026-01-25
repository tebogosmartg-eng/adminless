import { useState } from 'react';
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

interface AddLearnerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAdd: (names: string[]) => void;
}

export const AddLearnerDialog = ({ isOpen, onOpenChange, onAdd }: AddLearnerDialogProps) => {
  const [learnerNames, setLearnerNames] = useState("");

  const handleAddLearner = () => {
    const names = learnerNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name !== "");

    if (names.length > 0) {
      onAdd(names);
      setLearnerNames("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Learners</DialogTitle>
          <DialogDescription>
            Enter full names to add to this class. Put each name on a new line.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="names">Learner Names</Label>
            <Textarea 
              id="names" 
              placeholder="e.g.&#10;John Doe&#10;Jane Smith&#10;Bob Wilson" 
              value={learnerNames}
              onChange={(e) => setLearnerNames(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddLearner} disabled={!learnerNames.trim()}>
            Add {learnerNames.split('\n').filter(n => n.trim()).length > 1 ? 'Learners' : 'Learner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};