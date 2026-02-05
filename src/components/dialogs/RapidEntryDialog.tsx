import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { Learner } from '@/lib/types';
import { ArrowRight, Check, Calculator } from 'lucide-react';

interface RapidEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateMark: (index: number, mark: string) => void;
  maxMark?: number;
}

export const RapidEntryDialog = ({ open, onOpenChange, learners, onUpdateMark, maxMark }: RapidEntryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMark, setCurrentMark] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize only when the dialog is opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setCurrentMark(learners[0]?.mark || '');
      // Ensure focus after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Update local input when navigating between students
  useEffect(() => {
    if (open && learners[currentIndex]) {
        setCurrentMark(learners[currentIndex].mark || '');
        inputRef.current?.focus();
        inputRef.current?.select();
    }
  }, [currentIndex, open]);

  const handleNext = () => {
    if (!learners[currentIndex]) return;
    
    // Pass the mark to the parent for validation and saving
    onUpdateMark(currentIndex, currentMark);
    
    // Move to next student or close if done
    if (currentIndex < learners.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  const progress = learners.length > 0 ? Math.round(((currentIndex + 1) / learners.length) * 100) : 0;
  const currentLearner = learners[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Rapid Mark Entry</DialogTitle>
          <DialogDescription>
            Enter marks sequentially. {maxMark && `Total marks: ${maxMark}`}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${progress}%` }} 
                />
            </div>
            <p className="text-[10px] uppercase font-bold text-right text-muted-foreground tracking-widest">
                Student {currentIndex + 1} of {learners.length}
            </p>

            <div className="flex flex-col items-center justify-center space-y-6 py-6">
                <div className="text-center">
                    <h3 className="text-2xl font-black text-foreground">{currentLearner?.name || "End of List"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Status: {currentLearner?.mark ? "Has Mark" : "Empty"}</p>
                </div>
                
                <div className="flex items-center gap-2 relative">
                    <Label htmlFor="rapid-mark" className="sr-only">Mark</Label>
                    <Input 
                        id="rapid-mark"
                        ref={inputRef}
                        value={currentMark}
                        onChange={(e) => setCurrentMark(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-center text-2xl font-bold w-40 h-16 shadow-inner"
                        placeholder="-"
                        autoComplete="off"
                    />
                    {currentMark.includes('/') && (
                        <div className="absolute -right-10 text-primary animate-pulse">
                            <Calculator className="h-6 w-6" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                    Previous
                </Button>
                <Button onClick={handleNext} className="min-w-[120px] font-bold">
                    {currentIndex === learners.length - 1 ? (
                        <>Finish <Check className="ml-2 h-4 w-4" /></>
                    ) : (
                        <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};