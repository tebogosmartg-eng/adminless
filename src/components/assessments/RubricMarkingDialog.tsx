"use client";

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { Rubric, Learner } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RubricMarkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubric: Rubric;
  learner: Learner;
  onSave: (score: number, selections: Record<string, string>) => void;
  initialSelections?: Record<string, string>;
  onNext?: () => void;
  onPrev?: () => void;
}

export const RubricMarkingDialog = ({
  open,
  onOpenChange,
  rubric,
  learner,
  onSave,
  initialSelections = {},
  onNext,
  onPrev
}: RubricMarkingDialogProps) => {
  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);

  useEffect(() => {
    if (open) {
        setSelections(initialSelections);
    }
  }, [open, initialSelections, learner.id]);

  const currentScore = useMemo(() => {
    let total = 0;
    rubric.criteria.forEach(c => {
        const levelId = selections[c.id];
        if (levelId) {
            const level = c.levels.find(l => l.id === levelId);
            if (level) total += level.points;
        }
    });
    return total;
  }, [selections, rubric]);

  const handleSelect = (criterionId: string, levelId: string) => {
    setSelections(prev => ({ ...prev, [criterionId]: levelId }));
  };

  const handleSave = () => {
    onSave(currentScore, selections);
    if (!onNext) onOpenChange(false);
    else onNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground shrink-0 z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase tracking-widest text-[10px]">Marking with Rubric</Badge>
                    <DialogTitle className="text-2xl font-bold">{learner.name}</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80">{rubric.title}</DialogDescription>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold opacity-60">Total Points</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{currentScore}</span>
                        <span className="text-xl opacity-40">/ {rubric.total_points}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onPrev} disabled={!onPrev}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onNext} disabled={!onNext}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSave} className="font-bold">
                    <Save className="h-4 w-4 mr-2" /> Save & Continue
                </Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-8">
                {rubric.criteria.map((criterion) => (
                    <div key={criterion.id} className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="font-bold text-lg">{criterion.title}</h4>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Weight: {criterion.weight} pts</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {criterion.levels.map((level) => {
                                const isSelected = selections[criterion.id] === level.id;
                                return (
                                    <button
                                        key={level.id}
                                        onClick={() => handleSelect(criterion.id, level.id)}
                                        className={cn(
                                            "flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200 h-full",
                                            isSelected 
                                                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                                                : "border-muted hover:border-primary/40 bg-card"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={cn("text-xs font-bold uppercase", isSelected ? "text-primary" : "text-muted-foreground")}>
                                                {level.label}
                                            </span>
                                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-4">
                                                {level.descriptor || `Standard achievement level for ${level.label.toLowerCase()} performance.`}
                                            </p>
                                        </div>
                                        <div className="mt-auto pt-2 border-t flex justify-between items-center w-full">
                                            <span className="text-xs font-bold text-muted-foreground">Points</span>
                                            <span className={cn("text-xl font-black", isSelected ? "text-primary" : "")}>{level.points}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="h-10" />
        </div>
      </DialogContent>
    </Dialog>
  );
};