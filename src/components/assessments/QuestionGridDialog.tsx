"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Assessment, Learner, AssessmentMark } from '@/lib/types';
import { Loader2, Save, AlertCircle, Grid3X3 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface QuestionGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment;
  learners: Learner[];
  existingMarks: AssessmentMark[];
  onSave: (updates: any[]) => Promise<void>;
  isLocked?: boolean;
}

export const QuestionGridDialog = ({
  open,
  onOpenChange,
  assessment,
  learners,
  existingMarks,
  onSave,
  isLocked = false
}: QuestionGridDialogProps) => {
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && assessment.questions) {
      const initialData: Record<string, Record<string, string>> = {};
      learners.forEach(l => {
        if (!l.id) return;
        initialData[l.id] = {};
        const markRecord = existingMarks.find(m => m.learner_id === l.id && m.assessment_id === assessment.id);
        
        assessment.questions!.forEach(q => {
          const qMark = markRecord?.question_marks?.find(qm => qm.question_id === q.id);
          initialData[l.id][q.id] = qMark?.score !== undefined && qMark?.score !== null ? String(qMark.score) : "";
        });
      });
      setGridData(initialData);
    }
  }, [open, assessment, learners, existingMarks]);

  const handleCellChange = (learnerId: string, questionId: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setGridData(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [questionId]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates: any[] = [];

    learners.forEach(l => {
      if (!l.id) return;
      const lData = gridData[l.id] || {};
      let total = 0;
      const qMarksObj: Record<string, number> = {};

      assessment.questions?.forEach(q => {
        const valStr = lData[q.id];
        if (valStr !== undefined && valStr !== "") {
          const valNum = parseFloat(valStr);
          total += valNum;
          qMarksObj[q.id] = valNum;
        }
      });

      const payload = {
        assessment_id: assessment.id,
        learner_id: l.id,
        score: parseFloat(total.toFixed(1)),
        question_marks: qMarksObj
      };
      
      console.log("Saving marks payload:", payload);
      updates.push(payload);
    });

    try {
      await onSave(updates);
      showSuccess("Grid marks saved successfully.");
      onOpenChange(false);
    } catch (e) {
      showError("Failed to save grid marks.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Grid3X3 className="h-5 w-5" /> Rapid Grid Entry: {assessment.title}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Learner</TableHead>
                {assessment.questions?.map(q => <TableHead key={q.id} className="text-center">{q.question_number}</TableHead>)}
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  {assessment.questions?.map(q => (
                    <TableCell key={q.id} className="p-1">
                      <Input 
                        value={l.id ? gridData[l.id]?.[q.id] || "" : ""}
                        onChange={(e) => l.id && handleCellChange(l.id, q.id, e.target.value)}
                        className="h-8 text-center"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">
                    {l.id ? Object.values(gridData[l.id] || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0).toFixed(1) : 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="p-6 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Save Grid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};