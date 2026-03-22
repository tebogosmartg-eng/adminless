import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Learner } from '@/lib/types';

interface EditLearnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateLearners: (learners: Learner[]) => void;
}

export const EditLearnersDialog = ({ open, onOpenChange, learners, onUpdateLearners }: EditLearnersDialogProps) => {
  const [editedLearners, setEditedLearners] = useState<Learner[]>([]);

  useEffect(() => {
    if (open) {
      setEditedLearners([...learners]);
    }
  }, [open, learners]);

  const handleNameChange = (index: number, name: string) => {
    const updated = [...editedLearners];
    updated[index] = { ...updated[index], name };
    setEditedLearners(updated);
  };

  const handleGenderChange = (index: number, gender: string) => {
    const updated = [...editedLearners];
    updated[index] = { ...updated[index], gender: gender === "none" ? "" : gender };
    setEditedLearners(updated);
  };

  const handleRemove = (index: number) => {
    setEditedLearners(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    setEditedLearners(prev => [...prev, { name: "", mark: "", gender: "" }]);
  };

  const handleSave = () => {
    onUpdateLearners(editedLearners.filter(l => l.name.trim() !== ""));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        
        {/* FIXED HEADER */}
        <div className="p-6 pb-4 border-b shrink-0 bg-background z-10">
          <DialogHeader>
            <DialogTitle>Update Class Roster</DialogTitle>
            <DialogDescription>
              Add, remove, or rename learners, and assign gender to support Smart Grouping.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* SCROLLABLE CONTENT - Using native overflow-y-auto and min-h-0 for reliable flex scrolling */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-2 pb-2">
                {editedLearners.map((learner, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input 
                            value={learner.name}
                            onChange={(e) => handleNameChange(index, e.target.value)}
                            placeholder="Learner Name"
                            className="flex-1"
                        />
                        <Select 
                            value={learner.gender || "none"}
                            onValueChange={(val) => handleGenderChange(index, val)}
                        >
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="shrink-0">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                    </div>
                ))}
                
                {editedLearners.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground italic">
                        No learners in this class yet.
                    </div>
                )}
            </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="p-6 pt-4 border-t bg-background shrink-0 flex flex-col gap-3 z-10">
            <Button variant="outline" onClick={handleAdd} className="w-full border-dashed hover:border-primary/50">
                <Plus className="mr-2 h-4 w-4" /> Add Row
            </Button>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Roster Changes</Button>
            </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
};