import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Assessment, Rubric } from '@/lib/types';
import { Layers } from 'lucide-react';

interface EditAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  onSave: (assessment: Assessment) => void;
  availableRubrics: Rubric[];
}

export const EditAssessmentDialog = ({
  open,
  onOpenChange,
  assessment,
  onSave,
  availableRubrics
}: EditAssessmentDialogProps) => {
  const [formData, setFormData] = useState<Partial<Assessment>>({});

  useEffect(() => {
    if (assessment) {
      setFormData({ ...assessment });
    }
  }, [assessment]);

  const handleSave = () => {
    if (formData.title && formData.max_mark !== undefined && formData.weight !== undefined) {
      onSave(formData as Assessment);
    }
  };

  const handleRubricSelect = (val: string) => {
      const rubricId = val === 'none' ? null : val;
      const rubric = availableRubrics.find(r => r.id === rubricId);
      
      setFormData({ 
          ...formData, 
          rubric_id: rubricId,
          max_mark: rubric ? rubric.total_points : formData.max_mark 
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Assessment Settings</DialogTitle>
          <DialogDescription>
            Update the title, total marks, and weight for this task.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Title</Label>
            <Input 
              value={formData.title || ""} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              className="col-span-3 h-9" 
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Rubric</Label>
            <Select value={formData.rubric_id || "none"} onValueChange={handleRubricSelect}>
                <SelectTrigger className="col-span-3 h-9">
                    <SelectValue placeholder="None (Standard Mark)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">-- Standard Score --</SelectItem>
                    {availableRubrics.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                                <Layers className="h-3 w-3 text-muted-foreground" />
                                {r.title} ({r.total_points} pts)
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Max Mark</Label>
            <Input 
                type="number" 
                value={formData.max_mark || ""} 
                onChange={e => setFormData({ ...formData, max_mark: parseInt(e.target.value) })} 
                className="col-span-3 h-9"
                disabled={!!formData.rubric_id}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Weight (%)</Label>
            <Input 
              type="number" 
              value={formData.weight || ""} 
              onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })} 
              className="col-span-3 h-9" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};