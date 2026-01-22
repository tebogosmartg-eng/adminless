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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddLearnerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAdd: (name: string) => void;
}

export const AddLearnerDialog = ({ isOpen, onOpenChange, onAdd }: AddLearnerDialogProps) => {
  const [newLearnerName, setNewLearnerName] = useState("");

  const handleAddLearner = () => {
    if (newLearnerName.trim()) {
      onAdd(newLearnerName.trim());
      setNewLearnerName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Learner</DialogTitle>
          <DialogDescription>
            Enter the full name of the learner to add to this class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Learner Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. John Doe" 
              value={newLearnerName}
              onChange={(e) => setNewLearnerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLearner()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddLearner}>Add Learner</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};