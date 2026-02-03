"use client";

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRightCircle, ShieldCheck, AlertCircle, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '@/db';
import { ClassInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RollForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTermId: string;
  sourceTermName: string;
  targetTermId: string;
  targetTermName: string;
  onConfirm: (selectedClassIds: string[]) => Promise<void>;
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
  const [sourceClasses, setSourceClasses] = useState<ClassInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && sourceTermId) {
      const fetchClasses = async () => {
        setLoading(true);
        const classes = await db.classes.where('term_id').equals(sourceTermId).toArray();
        const learners = await db.learners.toArray();
        
        const enriched = classes.map(c => ({
            ...c,
            learners: learners.filter(l => l.class_id === c.id)
        })) as ClassInfo[];

        setSourceClasses(enriched);
        setSelectedIds(enriched.map(c => c.id)); // Default select all
        setLoading(false);
      };
      fetchClasses();
    }
  }, [open, sourceTermId]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleAll = () => {
    if (selectedIds.length === sourceClasses.length) setSelectedIds([]);
    else setSelectedIds(sourceClasses.map(c => c.id));
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(selectedIds);
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-primary" />
            Controlled Roll-Forward
          </DialogTitle>
          <DialogDescription>
            Migrate class structures from <span className="font-bold text-foreground">{sourceTermName}</span> to <span className="font-bold text-foreground">{targetTermName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3 mt-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Academic Policy</p>
                <p className="text-[11px] text-amber-800 leading-tight">
                    This action copies <strong>Rosters only</strong> (Names and IDs).
                    Marks, activities, and reports are <strong>NEVER</strong> copied to ensure a clean start for the new term.
                </p>
            </div>
        </div>

        <div className="flex items-center justify-between mt-4 mb-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Classes ({selectedIds.length})</h4>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleToggleAll}>
                {selectedIds.length === sourceClasses.length ? "Deselect All" : "Select All"}
            </Button>
        </div>

        <ScrollArea className="flex-1 border rounded-md bg-muted/20">
          {loading ? (
             <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin opacity-20" /></div>
          ) : sourceClasses.length === 0 ? (
             <div className="p-8 text-center text-sm text-muted-foreground italic">No classes found in source term.</div>
          ) : (
             <div className="divide-y divide-border/50">
               {sourceClasses.map((c) => (
                  <div 
                    key={c.id} 
                    className={cn(
                        "flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-background",
                        selectedIds.includes(c.id) ? "bg-background" : "opacity-60"
                    )}
                    onClick={() => handleToggle(c.id)}
                  >
                    <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => handleToggle(c.id)} />
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

        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
                onClick={handleConfirm} 
                disabled={selectedIds.length === 0 || isProcessing}
                className="bg-primary hover:bg-primary/90"
            >
                {isProcessing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migrating...</>
                ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Roll-Forward</>
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};