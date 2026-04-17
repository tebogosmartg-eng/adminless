"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Assessment, Learner } from '@/lib/types';
import { Save, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface QuestionMarkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment;
  learner: Learner;
  onSave: (score: number, questionMarks: Record<string, number>) => void;
  initialMarks?: any[];
  onNext?: () => void;
  onPrev?: () => void;
  isLocked?: boolean;
}

export const QuestionMarkingDialog = ({
  open,
  onOpenChange,
  assessment,
  learner,
  onSave,
  initialMarks = [],
  onNext,
  onPrev,
  isLocked = false
}: QuestionMarkingDialogProps) => {
  const [qMarks, setQMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
        const map: Record<string, string> = {};
        assessment.questions?.forEach(q => {
            const existing = initialMarks.find(m => m.question_id === q.id);
            map[q.id] = existing?.score?.toString() || "";
        });
        setQMarks(map);
    }
  }, [open, initialMarks, learner.id, assessment.questions]);

  const currentScore = useMemo(() => {
    let total = 0;
    Object.values(qMarks).forEach(val => {
        const n = parseFloat(val);
        if (!isNaN(n)) total += n;
    });
    return parseFloat(total.toFixed(1));
  }, [qMarks]);

  const handleSave = () => {
    const qMarksObj: Record<string, number> = {};
    Object.entries(qMarks).forEach(([qId, val]) => {
        if (val !== "") qMarksObj[qId] = parseFloat(val);
    });
    
    const payload = { score: currentScore, question_marks: qMarksObj };
    console.log("Saving marks payload:", payload);
    
    onSave(currentScore, qMarksObj);
    if (!onNext) onOpenChange(false);
    else onNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
            <DialogTitle>{learner.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {assessment.questions?.map(q => (
                <div key={q.id} className="flex items-center justify-between">
                    <Label>{q.question_number}</Label>
                    <Input 
                        className="w-20"
                        value={qMarks[q.id] || ""}
                        onChange={(e) => setQMarks(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                </div>
            ))}
        </div>
        <DialogFooter>
            <Button onClick={handleSave} disabled={isLocked}>
                <Save className="mr-2 h-4 w-4" /> Save
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};