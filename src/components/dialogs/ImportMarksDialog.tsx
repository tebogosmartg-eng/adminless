import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';

interface ImportMarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (learners: Learner[]) => void;
}

export const ImportMarksDialog = ({ open, onOpenChange, onImport }: ImportMarksDialogProps) => {
  const [text, setText] = useState('');

  const handleImport = () => {
    if (!text.trim()) return;

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const imported: Learner[] = lines.map(line => {
      // Basic CSV parsing: Name,Mark or just Name
      const parts = line.split(',');
      const name = parts[0].trim();
      let mark = "";
      
      if (parts.length > 1) {
        mark = parts[1].trim();
      }
      
      return { name, mark };
    });

    if (imported.length > 0) {
      onImport(imported);
      showSuccess(`Imported ${imported.length} learners.`);
      setText('');
    } else {
      showError("No valid data found.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Learners</DialogTitle>
          <DialogDescription>
            Paste learner names (one per line). Optionally add marks separated by a comma.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea 
            placeholder="John Doe, 85&#10;Jane Smith, 92&#10;Peter Pan" 
            className="min-h-[200px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport}>Import</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};