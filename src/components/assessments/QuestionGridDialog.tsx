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
  // state structure: { learnerId: { questionId: "scoreString" } }
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data when dialog opens
  useEffect(() => {
    if (open && assessment.questions) {
      const initialData: Record<string, Record<string, string>> = {};
      learners.forEach(l => {
        if (!l.id) return;
        initialData[l.id] = {};
        const markRecord = existingMarks.find(m => m.learner_id === l.id && m.assessment_id === assessment.id);
        
        assessment.questions!.forEach(q => {
          const qMark = markRecord?.question_marks?.[q.id];
          initialData[l.id][q.id] = qMark !== undefined && qMark !== null ? String(qMark) : "";
        });
      });
      setGridData(initialData);
    }
  }, [open, assessment, learners, existingMarks]);

  const handleCellChange = (learnerId: string, questionId: string, value: string) => {
    // Basic validation to allow typing decimals
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    setGridData(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        [questionId]: value
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      nextRow = Math.min(learners.length - 1, rowIdx + 1);
      shouldMove = true;
    } else if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, rowIdx - 1);
      shouldMove = true;
    } else if (e.key === 'ArrowRight') {
      const target = e.target as HTMLInputElement;
      if (target.selectionStart === target.value.length) {
        nextCol = Math.min((assessment.questions?.length || 1) - 1, colIdx + 1);
        shouldMove = true;
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.target as HTMLInputElement;
      if (target.selectionStart === 0) {
        nextCol = Math.max(0, colIdx - 1);
        shouldMove = true;
      }
    }

    if (shouldMove) {
      e.preventDefault();
      const nextId = `grid-input-${nextRow}-${nextCol}`;
      const el = document.getElementById(nextId) as HTMLInputElement;
      if (el) {
        el.focus();
        // Slight delay for select to work consistently across browsers after focus
        setTimeout(() => el.select(), 0);
      }
    }
  };

  const validateGrid = () => {
    let isValid = true;
    learners.forEach(l => {
      if (!l.id) return;
      assessment.questions?.forEach(q => {
        const valStr = gridData[l.id]?.[q.id];
        if (valStr) {
          const valNum = parseFloat(valStr);
          if (isNaN(valNum) || valNum < 0 || valNum > q.max_mark) {
            isValid = false;
          }
        }
      });
    });
    return isValid;
  };

  const getRowTotal = (learnerId: string) => {
    const lData = gridData[learnerId] || {};
    let total = 0;
    assessment.questions?.forEach(q => {
      const valStr = lData[q.id];
      if (valStr) {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 0 && val <= q.max_mark) {
          total += val;
        }
      }
    });
    return parseFloat(total.toFixed(1));
  };

  const handleSave = async () => {
    if (!validateGrid()) {
      showError("Please fix invalid marks (highlighted in red) before saving.");
      return;
    }

    setIsSaving(true);
    const updates: any[] = [];

    learners.forEach(l => {
      if (!l.id) return;
      const lData = gridData[l.id] || {};
      let total = 0;
      let hasAnyMark = false;
      const qMarks: Record<string, number | null> = {};

      assessment.questions?.forEach(q => {
        const valStr = lData[q.id];
        if (valStr !== undefined && valStr !== "") {
          const valNum = parseFloat(valStr);
          total += valNum;
          qMarks[q.id] = valNum;
          hasAnyMark = true;
        } else {
          qMarks[q.id] = null;
        }
      });

      if (hasAnyMark) {
        updates.push({
          assessment_id: assessment.id,
          learner_id: l.id,
          score: parseFloat(total.toFixed(1)),
          question_marks: qMarks
        });
      } else {
        updates.push({
          assessment_id: assessment.id,
          learner_id: l.id,
          score: null,
          question_marks: {}
        });
      }
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

  const isGridValid = useMemo(() => validateGrid(), [gridData]);

  if (!assessment.questions || assessment.questions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/10 shrink-0">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <DialogTitle className="text-xl flex items-center gap-2 text-primary">
                  <Grid3X3 className="h-5 w-5" />
                  Rapid Grid Entry: {assessment.title}
                </DialogTitle>
                <DialogDescription>
                  Enter marks per question. Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border">Enter</kbd> to move down, <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border">Tab</kbd> or arrows to move right.
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Possible</p>
                <p className="text-2xl font-black text-foreground">{assessment.max_mark}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto bg-muted/5 p-4">
          <div className="border rounded-xl shadow-sm bg-background overflow-hidden relative">
            <div className="overflow-x-auto max-h-[60vh]">
              <Table className="table-fixed border-collapse w-full">
                <TableHeader className="sticky top-0 z-20 bg-slate-100 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 z-30 bg-slate-100 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs font-black uppercase tracking-wider">
                      Learner
                    </TableHead>
                    {assessment.questions.map(q => (
                      <TableHead key={q.id} className="min-w-[80px] w-[80px] text-center border-r p-2">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-xs text-slate-900">{q.question_number}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">/{q.max_mark}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px] text-center sticky right-0 z-30 bg-blue-50 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-black text-xs text-blue-900 uppercase">Total</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learners.map((l, rowIdx) => {
                    const rowTotal = l.id ? getRowTotal(l.id) : 0;
                    const isTotalError = rowTotal > assessment.max_mark;

                    return (
                      <TableRow key={l.id || rowIdx} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="sticky left-0 z-10 bg-background group-hover:bg-muted/30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-medium text-sm truncate px-4 py-2">
                          {l.name}
                        </TableCell>
                        
                        {assessment.questions!.map((q, colIdx) => {
                          const valStr = l.id ? gridData[l.id]?.[q.id] || "" : "";
                          const valNum = parseFloat(valStr);
                          const isInvalid = valStr !== "" && (isNaN(valNum) || valNum < 0 || valNum > q.max_mark);

                          return (
                            <TableCell key={q.id} className="p-0 border-r relative">
                              <Input
                                id={`grid-input-${rowIdx}-${colIdx}`}
                                value={valStr}
                                onChange={(e) => l.id && handleCellChange(l.id, q.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                disabled={isLocked}
                                className={cn(
                                  "h-12 w-full text-center font-bold border-none rounded-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:z-10 bg-transparent transition-colors",
                                  isInvalid && "bg-red-50 text-red-700 focus-visible:ring-red-500 font-black",
                                  isLocked && "opacity-50 cursor-not-allowed"
                                )}
                                placeholder="-"
                              />
                            </TableCell>
                          );
                        })}
                        
                        <TableCell className={cn(
                          "sticky right-0 z-10 border-l text-center font-black text-lg shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]",
                          isTotalError ? "bg-red-100 text-red-700" : "bg-blue-50/50 text-blue-900 group-hover:bg-blue-100/50 transition-colors"
                        )}>
                          {rowTotal}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isGridValid && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Fix invalid marks (red cells) before saving.
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isLocked || !isGridValid}
              className="font-bold gap-2 bg-blue-600 hover:bg-blue-700 w-32"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Grid
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};