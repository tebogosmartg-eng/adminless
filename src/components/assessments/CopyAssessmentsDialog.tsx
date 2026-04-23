import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { db } from '@/db';
import { showSuccess, showError } from '@/utils/toast';
import { Assessment } from '@/lib/types';
import { Loader2, Copy } from 'lucide-react';

interface CopyAssessmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClassId: string;
  currentTermId: string;
  onSuccess: () => void;
}

export const CopyAssessmentsDialog = ({ 
  open, 
  onOpenChange, 
  currentClassId, 
  currentTermId,
  onSuccess 
}: CopyAssessmentsDialogProps) => {
  const { classes } = useClasses();
  const { createAssessment } = useAcademic();
  
  const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>("");
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [sourceAssessments, setSourceAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  // Filter out current class and only show active classes
  const availableClasses = useMemo(() => {
    return classes.filter(c => c.id !== currentClassId && !c.archived);
  }, [classes, currentClassId]);

  const handleClassSelect = async (classId: string) => {
    setSelectedSourceClassId(classId);
    setLoadingAssessments(true);
    setSelectedAssessmentIds([]);

    try {
      // Query Local DB instead of Supabase
      const data = await db.assessments
        .where('class_id')
        .equals(classId)
        .filter(a => a.term_id === currentTermId)
        .toArray();

      setSourceAssessments(data || []);
      // Auto-select all by default
      if (data) setSelectedAssessmentIds(data.map(a => a.id));

    } catch (err) {
      console.error(err);
      showError("Failed to fetch assessments from source class.");
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleToggleAssessment = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAssessmentIds(prev => [...prev, id]);
    } else {
      setSelectedAssessmentIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleCopy = async () => {
    if (selectedAssessmentIds.length === 0) return;
    setIsCopying(true);

    try {
      const toCopy = sourceAssessments.filter(a => selectedAssessmentIds.includes(a.id));
      
      // Execute sequentially to ensure order or just parallel
      await Promise.all(toCopy.map(ass => 
        createAssessment({
          class_id: currentClassId,
          term_id: currentTermId,
          title: ass.title,
          type: ass.type,
          max_mark: ass.max_mark,
          weight: ass.weight,
          date: ass.date || new Date().toISOString()
        })
      ));

      showSuccess(`Copied ${toCopy.length} assessments.`);
      onSuccess();
      onOpenChange(false);
      // Reset
      setSelectedSourceClassId("");
      setSourceAssessments([]);
    } catch (err) {
      console.error(err);
      showError("Failed to copy assessments.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Assessment Structure</DialogTitle>
          <DialogDescription>
            Import assessment definitions from another class. Marks are not copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Source Class</Label>
            <Select value={selectedSourceClassId} onValueChange={handleClassSelect}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select a class..." />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.subject} - {c.className} ({c.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingAssessments && (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-30" />
            </div>
          )}

          {!loadingAssessments && selectedSourceClassId && sourceAssessments.length === 0 && (
            <div className="text-center p-4 text-sm text-muted-foreground border border-dashed rounded-md bg-muted/10">
              No assessments found in this class for the selected term.
            </div>
          )}

          {!loadingAssessments && sourceAssessments.length > 0 && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <Label>Select Assessments</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2 bg-muted/5">
                <div className="space-y-2">
                  {sourceAssessments.map(ass => (
                    <div key={ass.id} className="flex items-start space-x-3 p-3 bg-background border hover:border-primary/30 rounded-md transition-colors cursor-pointer" onClick={() => handleToggleAssessment(ass.id, !selectedAssessmentIds.includes(ass.id))}>
                      <Checkbox 
                        id={`chk-${ass.id}`} 
                        checked={selectedAssessmentIds.includes(ass.id)}
                        onCheckedChange={(c) => handleToggleAssessment(ass.id, !!c)}
                        className="mt-0.5"
                      />
                      <div className="grid gap-1.5 leading-none flex-1 min-w-0">
                        <label
                          htmlFor={`chk-${ass.id}`}
                          className="text-sm font-bold leading-none cursor-pointer truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ass.title}
                        </label>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                          {ass.type} • Max: {ass.max_mark} • Weight: {ass.weight}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">Cancel</Button>
          <Button onClick={handleCopy} disabled={isCopying || selectedAssessmentIds.length === 0} className="w-full sm:w-auto h-10 font-bold">
            {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};