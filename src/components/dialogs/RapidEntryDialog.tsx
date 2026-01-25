import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Learner } from "@/components/CreateClassDialog";
import { ChevronLeft, ChevronRight, Check, Calculator } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface RapidEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learners: Learner[];
  onComplete: (updatedLearners: Learner[]) => void;
}

export const RapidEntryDialog = ({
  isOpen,
  onOpenChange,
  learners,
  onComplete,
}: RapidEntryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localLearners, setLocalLearners] = useState<Learner[]>([]);
  const markInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalLearners(JSON.parse(JSON.stringify(learners)));
      // Find first learner without a mark to start there, otherwise 0
      const firstUngraded = learners.findIndex((l) => !l.mark);
      setCurrentIndex(firstUngraded !== -1 ? firstUngraded : 0);
    }
  }, [isOpen, learners]);

  // Focus management
  useEffect(() => {
    if (isOpen && markInputRef.current) {
        // Small timeout to ensure dialog animation is done and DOM is ready
        setTimeout(() => {
            markInputRef.current?.focus();
            markInputRef.current?.select();
        }, 50);
    }
  }, [currentIndex, isOpen]);

  const currentLearner = localLearners[currentIndex];

  const handleNext = () => {
    if (currentIndex < localLearners.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleChange = (field: 'mark' | 'comment', value: string) => {
    const updated = [...localLearners];
    updated[currentIndex] = { ...updated[currentIndex], [field]: value };
    
    // Auto-calculate logic for marks (e.g. 15/20 -> 75)
    if (field === 'mark') {
        const fractionMatch = value.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
        if (fractionMatch) {
            const num = parseFloat(fractionMatch[1]);
            const den = parseFloat(fractionMatch[3]);
            if (den !== 0) {
                updated[currentIndex].mark = ((num / den) * 100).toFixed(1).replace(/\.0$/, '');
            }
        }
    }
    
    setLocalLearners(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex < localLearners.length - 1) {
            handleNext();
        } else {
            // Optional: Auto-save on last enter? For now, let user click Done.
            // Or loop back?
            // Let's just focus save button or do nothing
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
    }
  };

  const handleSaveAndClose = () => {
    onComplete(localLearners);
    onOpenChange(false);
    showSuccess("Rapid entry data saved.");
  };

  if (!currentLearner) return null;

  const progress = Math.round(((currentIndex + 1) / localLearners.length) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Rapid Entry Mode</span>
            <span className="text-sm font-normal text-muted-foreground">
                {currentIndex + 1} / {localLearners.length}
            </span>
          </DialogTitle>
          <DialogDescription>
            Type mark (e.g. "85" or "15/20"). Press Enter for next.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
            <Progress value={progress} className="h-2" />
            
            <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold truncate">{currentLearner.name}</h3>
                <p className="text-sm text-muted-foreground">Enter mark below</p>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col items-center relative">
                    <Input 
                        ref={markInputRef}
                        value={currentLearner.mark}
                        onChange={(e) => handleChange('mark', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-center text-3xl h-16 w-40 font-bold tracking-wider"
                        placeholder="%"
                    />
                    <div className="absolute right-12 top-5 opacity-20 pointer-events-none">
                        <Calculator className="h-6 w-6" />
                    </div>
                </div>
                
                <div className="px-4">
                    <Label htmlFor="comment" className="text-xs text-muted-foreground">Comment (Optional)</Label>
                    <Input 
                        id="comment"
                        value={currentLearner.comment || ""}
                        onChange={(e) => handleChange('comment', e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Good effort..."
                        className="mt-1"
                    />
                </div>
            </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext} disabled={currentIndex === localLearners.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <Button onClick={handleSaveAndClose}>
                Done <Check className="ml-2 h-4 w-4" />
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};