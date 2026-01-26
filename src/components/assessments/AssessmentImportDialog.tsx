import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from 'react';
import { Learner, Assessment } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { Upload } from 'lucide-react';

interface AssessmentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessments: Assessment[];
  learners: Learner[];
  onImport: (assessmentId: string, marks: { learnerId: string; score: number }[]) => void;
}

export const AssessmentImportDialog = ({ open, onOpenChange, assessments, learners, onImport }: AssessmentImportDialogProps) => {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [text, setText] = useState('');

  // Map learner names to IDs for quick lookup (normalize to lowercase)
  const learnerMap = useMemo(() => {
    const map = new Map<string, string>();
    learners.forEach(l => {
      if(l.id) map.set(l.name.toLowerCase().trim(), l.id);
    });
    return map;
  }, [learners]);

  const handleImport = () => {
    if (!selectedAssessmentId || !text.trim()) {
        showError("Please select an assessment and enter data.");
        return;
    }

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const updates: { learnerId: string; score: number }[] = [];
    const missingNames: string[] = [];

    lines.forEach(line => {
      // Expect CSV format: Name, Mark
      const parts = line.split(',');
      if (parts.length >= 2) {
          const name = parts[0].trim().toLowerCase();
          const markStr = parts[1].trim();
          const score = parseFloat(markStr);

          const learnerId = learnerMap.get(name);
          
          if (learnerId && !isNaN(score)) {
              updates.push({ learnerId, score });
          } else if (!learnerId) {
              missingNames.push(parts[0].trim());
          }
      }
    });

    if (updates.length > 0) {
      onImport(selectedAssessmentId, updates);
      showSuccess(`Imported ${updates.length} marks.`);
      if (missingNames.length > 0) {
          console.warn("Could not find learners:", missingNames);
          showError(`Skipped ${missingNames.length} names not found in class list.`);
      }
      setText('');
      onOpenChange(false);
    } else {
      showError("No valid matching data found.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Assessment Marks</DialogTitle>
          <DialogDescription>
            Bulk import marks for a specific assessment. Paste CSV data (Name, Mark).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
              <label className="text-sm font-medium">Select Assessment</label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                  <SelectTrigger><SelectValue placeholder="Choose assessment..." /></SelectTrigger>
                  <SelectContent>
                      {assessments.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.title} (Max: {a.max_mark})</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>

          <div className="space-y-2">
              <label className="text-sm font-medium">Paste Data</label>
              <Textarea 
                placeholder="John Doe, 25&#10;Jane Smith, 42" 
                className="min-h-[200px] font-mono text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                  Format: Learner Name, Score (Raw mark, not percentage)
              </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!selectedAssessmentId}>
                <Upload className="mr-2 h-4 w-4" /> Import Marks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};