"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, ArrowLeftRight, Save, Loader2, ListChecks } from 'lucide-react';
import { AssessmentMark, Learner, ScannedLearner, ClassInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ControlledReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMarks: AssessmentMark[];
  scannedLearners: ScannedLearner[];
  learnerMappings: Record<number, string>;
  targetClass: ClassInfo | undefined;
  assessmentId: string;
  onConfirm: (updates: any[]) => Promise<void>;
}

export const ControlledReplacementDialog = ({
  open,
  onOpenChange,
  existingMarks,
  scannedLearners,
  learnerMappings,
  targetClass,
  assessmentId,
  onConfirm
}: ControlledReplacementDialogProps) => {
  const [resolutionMode, setResolutionMode] = useState<'replace' | 'merge' | 'manual'>('manual');
  const [manualChoices, setManualChoices] = useState<Record<string, 'existing' | 'scanned'>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const conflicts = useMemo(() => {
      const list: any[] = [];
      
      scannedLearners.forEach((sl, idx) => {
          const lId = learnerMappings[idx];
          if (!lId) return;

          const existing = existingMarks.find(m => m.learner_id === lId);
          const learner = targetClass?.learners.find(l => l.id === lId);

          if (existing && existing.score !== null) {
              list.push({
                  learnerId: lId,
                  name: learner?.name || "Unknown",
                  existingScore: existing.score,
                  scannedScore: parseFloat(sl.mark),
                  isDifferent: existing.score !== parseFloat(sl.mark),
                  hasExistingQuestions: existing.question_marks && existing.question_marks.length > 0
              });
          }
      });

      return list;
  }, [existingMarks, scannedLearners, learnerMappings, targetClass]);

  const handleChoice = (learnerId: string, choice: 'existing' | 'scanned') => {
      setManualChoices(prev => ({ ...prev, [learnerId]: choice }));
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    
    const finalUpdates: any[] = [];

    // Map scanned to standard updates
    const scannedUpdates = scannedLearners
        .filter((_, idx) => learnerMappings[idx])
        .map((sl, idx) => ({
            assessment_id: assessmentId,
            learner_id: learnerMappings[idx],
            score: parseFloat(sl.mark),
            question_marks: sl.questionMarks // This will be processed by applyScannedData to map IDs
        }));

    if (resolutionMode === 'replace') {
        finalUpdates.push(...scannedUpdates);
    } else if (resolutionMode === 'merge') {
        // Only take scanned marks where NO existing mark exists
        const existingIds = new Set(existingMarks.filter(m => m.score !== null).map(m => m.learner_id));
        finalUpdates.push(...scannedUpdates.filter(u => !existingIds.has(u.learner_id)));
    } else {
        // Manual resolution
        scannedUpdates.forEach(update => {
            const conflict = conflicts.find(c => c.learnerId === update.learner_id);
            if (!conflict) {
                finalUpdates.push(update);
                return;
            }

            const choice = manualChoices[update.learner_id] || 'scanned';
            if (choice === 'scanned') {
                finalUpdates.push(update);
            } else {
                const existing = existingMarks.find(m => m.learner_id === update.learner_id);
                finalUpdates.push({
                    assessment_id: assessmentId,
                    learner_id: update.learner_id,
                    score: conflict.existingScore,
                    question_marks: existing?.question_marks
                });
            }
        });
    }

    await onConfirm(finalUpdates);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="bg-amber-600 p-6 text-white shrink-0">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="h-6 w-6" />
                    <DialogTitle className="text-2xl font-bold">Data Conflict Detected</DialogTitle>
                </div>
                <DialogDescription className="text-amber-50">
                    This assessment already contains {existingMarks.length} recorded marks. How would you like to handle the incoming scanned data?
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 mt-6">
                <button 
                    onClick={() => setResolutionMode('replace')}
                    className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        resolutionMode === 'replace' ? "bg-white text-amber-700 border-white shadow-lg" : "bg-amber-500/30 border-white/20 text-white hover:bg-amber-500/50"
                    )}
                >
                    <p className="font-bold text-xs uppercase mb-1">Replace All</p>
                    <p className="text-[10px] leading-tight opacity-80">Overwrite all existing marks with scanned values.</p>
                </button>
                <button 
                    onClick={() => setResolutionMode('merge')}
                    className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        resolutionMode === 'merge' ? "bg-white text-amber-700 border-white shadow-lg" : "bg-amber-500/30 border-white/20 text-white hover:bg-amber-500/50"
                    )}
                >
                    <p className="font-bold text-xs uppercase mb-1">Merge Missing</p>
                    <p className="text-[10px] leading-tight opacity-80">Only fill empty cells. Keep existing marks as they are.</p>
                </button>
                <button 
                    onClick={() => setResolutionMode('manual')}
                    className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        resolutionMode === 'manual' ? "bg-white text-amber-700 border-white shadow-lg" : "bg-amber-500/30 border-white/20 text-white hover:bg-amber-500/50"
                    )}
                >
                    <p className="font-bold text-xs uppercase mb-1">Manual Review</p>
                    <p className="text-[10px] leading-tight opacity-80">Review differences and pick value for each learner.</p>
                </button>
            </div>
        </div>

        <ScrollArea className="flex-1 p-6">
            {resolutionMode === 'manual' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            <ArrowLeftRight className="h-4 w-4" /> Comparison Table ({conflicts.length} Conflicts)
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600">
                            <ListChecks className="h-3 w-3" /> Includes Question Details
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Learner</TableHead>
                                    <TableHead className="text-center w-32">Current DB</TableHead>
                                    <TableHead className="text-center w-12"></TableHead>
                                    <TableHead className="text-center w-32">Scanned AI</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {conflicts.map((c, i) => (
                                    <TableRow key={i} className={cn(c.isDifferent && "bg-amber-50/30")}>
                                        <TableCell className="font-bold text-sm">
                                            {c.name}
                                            {c.hasExistingQuestions && (
                                                <Badge variant="outline" className="ml-2 h-4 text-[8px] uppercase border-amber-200 text-amber-700">Has Questions</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button 
                                                onClick={() => handleChoice(c.learnerId, 'existing')}
                                                className={cn(
                                                    "w-full py-1.5 rounded-lg border font-black text-lg transition-all",
                                                    manualChoices[c.learnerId] === 'existing' ? "bg-amber-600 text-white border-amber-700 shadow-md" : "bg-background hover:bg-muted"
                                                )}
                                            >
                                                {c.existingScore}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-30 mx-auto" />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button 
                                                onClick={() => handleChoice(c.learnerId, 'scanned')}
                                                className={cn(
                                                    "w-full py-1.5 rounded-lg border font-black text-lg transition-all",
                                                    (!manualChoices[c.learnerId] || manualChoices[c.learnerId] === 'scanned') ? "bg-primary text-white border-primary shadow-md" : "bg-background hover:bg-muted"
                                                )}
                                            >
                                                {c.scannedScore}
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    {resolutionMode === 'replace' ? (
                        <>
                            <div className="bg-red-100 p-6 rounded-full text-red-600"><AlertCircle className="h-16 w-16" /></div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Total Overwrite Selected</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    All current marks AND question-level detail will be replaced with the scanned results.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-green-100 p-6 rounded-full text-green-600"><CheckCircle2 className="h-16 w-16" /></div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Merge Selected</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    We will only fill in missing marks. Existing database values (including question details) will be preserved.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/5">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel Scan</Button>
            <Button 
                onClick={handleConfirmAction} 
                className="font-black h-12 px-10 bg-amber-600 hover:bg-amber-700"
                disabled={isProcessing}
            >
                {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Applying...</> : <><Save className="h-4 w-4 mr-2" /> Confirm & Apply Changes</>}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};