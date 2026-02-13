"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
    ArrowRightCircle, 
    AlertCircle, 
    Users, 
    CheckCircle2, 
    Loader2, 
    ChevronRight, 
    ChevronLeft,
    Trash2,
    Plus,
    UserPlus
} from 'lucide-react';
import { db } from '@/db';
import { ClassInfo, Learner } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StagedClass extends Omit<ClassInfo, 'learners'> {
    learners: Learner[];
}

interface RollForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTermId: string;
  sourceTermName: string;
  targetTermId: string;
  targetTermName: string;
  onConfirm: (preparedClasses: StagedClass[]) => Promise<void>;
}

export const RollForwardDialog = ({
  open,
  onOpenChange,
  sourceTermId,
  sourceTermName,
  targetTermId,
  targetTermName,
  onConfirm
}: RollForwardDialogProps) => {
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [sourceClasses, setSourceClasses] = useState<ClassInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stagedClasses, setStagedClasses] = useState<StagedClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // For adding a learner in preview
  const [newLearnerName, setNewLearnerName] = useState("");
  const [activePreviewClassIdx, setActivePreviewClassIdx] = useState(0);

  useEffect(() => {
    if (open && sourceTermId) {
      setStep('select');
      const fetchClasses = async () => {
        setLoading(true);
        const classes = await db.classes.where('term_id').equals(sourceTermId).toArray();
        const learners = await db.learners.toArray();
        
        const enriched = classes.map(c => ({
            ...c,
            learners: learners.filter(l => l.class_id === c.id)
        })) as ClassInfo[];

        setSourceClasses(enriched);
        setSelectedIds(enriched.map(c => c.id)); 
        setLoading(false);
      };
      fetchClasses();
    }
  }, [open, sourceTermId]);

  const handleNextStep = () => {
      const prepared = sourceClasses
        .filter(c => selectedIds.includes(c.id))
        .map(c => ({
            ...c,
            learners: [...c.learners].map(l => ({ ...l, mark: "", comment: "" }))
        }));
      setStagedClasses(prepared);
      setActivePreviewClassIdx(0);
      setStep('preview');
  };

  const handleRemoveLearner = (classIdx: number, learnerIdx: number) => {
      const updated = [...stagedClasses];
      updated[classIdx].learners = updated[classIdx].learners.filter((_, i) => i !== learnerIdx);
      setStagedClasses(updated);
  };

  const handleAddLearner = (classIdx: number) => {
      if (!newLearnerName.trim()) return;
      const updated = [...stagedClasses];
      updated[classIdx].learners.push({ 
          name: newLearnerName.trim(), 
          mark: "", 
          id: crypto.randomUUID() 
      });
      setStagedClasses(updated);
      setNewLearnerName("");
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(stagedClasses);
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 pb-0">
            <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        Step {step === 'select' ? '1' : '2'} of 2
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>{sourceTermName}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-primary">{targetTermName}</span>
                    </div>
                </div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <ArrowRightCircle className="h-6 w-6 text-primary" />
                    {step === 'select' ? "Select Classes" : "Review & Edit Rosters"}
                </DialogTitle>
                <DialogDescription>
                    {step === 'select' 
                        ? "Choose which class rosters you want to carry over to the next term."
                        : "Verify and clean up learner lists before finalizing the migration."}
                </DialogDescription>
            </DialogHeader>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
            {step === 'select' ? (
                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3 mb-4">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-tight">
                            Carry over learner names only. No marks, comments, or assessments will be copied.
                        </p>
                    </div>

                    <ScrollArea className="flex-1 border rounded-md bg-muted/20">
                    {loading ? (
                        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin opacity-20" /></div>
                    ) : (
                        <div className="divide-y divide-border/50">
                        {sourceClasses.map((c) => (
                            <div 
                                key={c.id} 
                                className={cn(
                                    "flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-background",
                                    selectedIds.includes(c.id) ? "bg-background" : "opacity-60"
                                )}
                                onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                            >
                                <Checkbox checked={selectedIds.includes(c.id)} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{c.className}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{c.subject} • {c.grade}</p>
                                </div>
                                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[9px] font-bold">
                                    <Users className="h-2.5 w-2.5" /> {c.learners.length}
                                </Badge>
                            </div>
                        ))}
                        </div>
                    )}
                    </ScrollArea>
                </div>
            ) : (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-t">
                    {/* Sidebar: Class List */}
                    <div className="w-full md:w-56 border-r bg-muted/10 overflow-y-auto">
                        {stagedClasses.map((c, idx) => (
                            <button
                                key={c.id}
                                onClick={() => setActivePreviewClassIdx(idx)}
                                className={cn(
                                    "w-full text-left p-4 border-b transition-colors flex items-center justify-between group",
                                    activePreviewClassIdx === idx ? "bg-primary text-primary-foreground shadow-inner" : "hover:bg-muted"
                                )}
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{c.className}</p>
                                    <p className={cn("text-[9px] uppercase", activePreviewClassIdx === idx ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                        {c.grade}
                                    </p>
                                </div>
                                <Badge variant={activePreviewClassIdx === idx ? "secondary" : "outline"} className="text-[9px] h-4">
                                    {c.learners.length}
                                </Badge>
                            </button>
                        ))}
                    </div>

                    {/* Main: Learner Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-background">
                        <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                            <h4 className="font-bold text-sm">Roster: {stagedClasses[activePreviewClassIdx]?.className}</h4>
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="Add learner..." 
                                    className="h-8 text-xs w-40" 
                                    value={newLearnerName}
                                    onChange={(e) => setNewLearnerName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddLearner(activePreviewClassIdx)}
                                />
                                <Button size="icon" className="h-8 w-8" onClick={() => handleAddLearner(activePreviewClassIdx)} disabled={!newLearnerName.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-2">
                            <div className="grid gap-1">
                                {stagedClasses[activePreviewClassIdx]?.learners.map((l, lIdx) => (
                                    <div key={l.id || lIdx} className="flex items-center justify-between p-2 px-3 rounded-md hover:bg-muted/50 border border-transparent group">
                                        <span className="text-sm font-medium">{l.name}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleRemoveLearner(activePreviewClassIdx, lIdx)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                {stagedClasses[activePreviewClassIdx]?.learners.length === 0 && (
                                    <div className="py-12 text-center text-muted-foreground italic text-xs">
                                        No learners in this list. Add some above.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Section */}
        <div className="p-6 pt-4 border-t bg-muted/5">
            <div className="flex justify-between items-center">
                <Button 
                    variant="ghost" 
                    onClick={() => step === 'select' ? onOpenChange(false) : setStep('select')}
                >
                    {step === 'select' ? "Cancel" : <><ChevronLeft className="mr-2 h-4 w-4" /> Back to Selection</>}
                </Button>
                
                {step === 'select' ? (
                    <Button 
                        onClick={handleNextStep} 
                        disabled={selectedIds.length === 0}
                    >
                        Review Prepared Rosters <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing Migration...</>
                        ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Commit to {targetTermName}</>
                        )}
                    </Button>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};