"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronRight, ChevronLeft, Save, Calculator, ListChecks } from 'lucide-react';
import { Assessment, Learner, QuestionMark } from '@/lib/types';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';

interface QuestionMarkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment;
  learner: Learner;
  onSave: (score: number, questionMarks: QuestionMark[]) => void;
  initialMarks?: QuestionMark[];
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

  // Diagnostic Logging
  useEffect(() => {
    if (open) {
      console.log(`[Diagnostic: QuestionMarking] Dialog opened for ${learner.name}.`);
      console.log(`[Diagnostic: QuestionMarking] isLocked state: ${isLocked}`);
    }
  }, [open, isLocked, learner.name]);

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
    // Return rounded result to match system precision
    return parseFloat(total.toFixed(1));
  }, [qMarks]);

  const handleUpdate = (qId: string, val: string) => {
    // Basic validation to allow digits and a single decimal point during typing
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
    
    setQMarks(prev => ({ ...prev, [qId]: val }));
  };

  const handleSave = () => {
    const finalMarks: QuestionMark[] = Object.entries(qMarks).map(([qId, val]) => ({
        question_id: qId,
        score: val === "" ? null : parseFloat(val)
    }));
    
    onSave(currentScore, finalMarks);
    if (!onNext) onOpenChange(false);
    else onNext();
  };

  const percentage = Math.round((currentScore / assessment.max_mark) * 100) || 0;

  const getCognitiveColor = (level?: string) => {
      switch(level) {
          case 'knowledge': return "bg-slate-100 text-slate-700";
          case 'comprehension': return "bg-blue-50 text-blue-700";
          case 'application': return "bg-green-50 text-green-700";
          case 'analysis': return "bg-purple-50 text-purple-700";
          case 'evaluation': return "bg-amber-50 text-amber-700";
          case 'creation': return "bg-red-50 text-red-700";
          default: return "bg-muted text-muted-foreground";
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col p-0 overflow-hidden h-[80vh]">
        <div className="bg-primary p-6 text-primary-foreground shrink-0">
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase tracking-widest text-[9px] font-black">Question-Level Entry</Badge>
                    <DialogTitle className="text-2xl font-bold">{learner.name}</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80">{assessment.title} • Term Total: {assessment.max_mark}</DialogDescription>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold opacity-60">Total Score</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{currentScore}</span>
                        <span className="text-xl opacity-40">/ {assessment.max_mark}</span>
                    </div>
                    <Badge className="mt-1 bg-white/20 text-white border-none">{percentage}%</Badge>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onPrev} disabled={!onPrev}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onNext} disabled={!onNext}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSave} className="font-bold" disabled={isLocked}>
                    <Save className="h-4 w-4 mr-2" /> {onNext ? "Save & Next" : "Save Analysis"}
                </Button>
            </div>
        </div>

        <ScrollArea className="flex-1 p-6 bg-muted/5">
            <div className="space-y-4">
                {assessment.questions?.map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-4 p-4 bg-background border rounded-xl shadow-sm group hover:border-primary/40 transition-all">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-black text-lg text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
                            {q.question_number}
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                            <h4 className="font-bold text-sm truncate" title={q.skill_description}>
                                {q.skill_description || "Standard Question"}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[9px] uppercase font-black text-muted-foreground tracking-widest border-muted-foreground/20">
                                    Max: {q.max_mark}
                                </Badge>
                                {q.topic && (
                                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-blue-200 text-blue-700 bg-blue-50/50">
                                        {q.topic}
                                    </Badge>
                                )}
                                {q.cognitive_level && q.cognitive_level !== 'unknown' && (
                                    <Badge className={cn("text-[9px] uppercase font-black tracking-widest border-none px-1.5", getCognitiveColor(q.cognitive_level))}>
                                        {q.cognitive_level}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="w-24 shrink-0">
                            <Input 
                                type="text"
                                inputMode="decimal"
                                value={qMarks[q.id] || ""}
                                onChange={(e) => handleUpdate(q.id, e.target.value)}
                                className={cn(
                                    "text-center text-lg font-bold h-12 bg-muted/30 focus:bg-background",
                                    isLocked && "opacity-50 cursor-not-allowed"
                                )}
                                placeholder="-"
                                autoFocus={idx === 0}
                                disabled={isLocked}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className="h-10" />
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10 text-center shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                <ListChecks className="h-3 w-3" />
                Data is auto-summed. Totals are synced to the main marksheet.
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};