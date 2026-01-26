import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface AddLearnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLearners: (names: string[]) => void;
}

export const AddLearnerDialog = ({ open, onOpenChange, onAddLearners }: AddLearnerDialogProps) => {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const names = text.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length > 0) {
      onAddLearners(names);
      setText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Learners</DialogTitle>
          <DialogDescription>
            Enter learner names, one per line.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea 
            placeholder="John Doe&#10;Jane Smith" 
            className="min-h-[150px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!text.trim()}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};