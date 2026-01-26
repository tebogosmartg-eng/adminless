import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess } from '@/utils/toast';

interface ModerationToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateLearners: (learners: Learner[]) => void;
}

export const ModerationToolsDialog = ({ open, onOpenChange, learners, onUpdateLearners }: ModerationToolsDialogProps) => {
  const [adjustment, setAdjustment] = useState(0);

  const handleApply = () => {
    if (adjustment === 0) return;

    const updated = learners.map(l => {
        const current = parseFloat(l.mark);
        if (isNaN(current)) return l;
        
        // Simple linear adjustment
        const newMark = Math.min(100, Math.max(0, current + adjustment));
        return { ...l, mark: newMark.toFixed(1).replace(/\.0$/, '') };
    });

    onUpdateLearners(updated);
    showSuccess(`Applied adjustment of ${adjustment > 0 ? '+' : ''}${adjustment}% to all marks.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Moderation Tools</DialogTitle>
          <DialogDescription>
            Adjust marks globally for the class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label>Global Mark Adjustment (%)</Label>
                <div className="flex gap-2">
                    <Input 
                        type="number"
                        value={adjustment}
                        onChange={(e) => setAdjustment(parseFloat(e.target.value))}
                    />
                    <Button onClick={handleApply}>Apply</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Positive values increase marks, negative values decrease them. Marks are capped at 0 and 100.
                </p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};