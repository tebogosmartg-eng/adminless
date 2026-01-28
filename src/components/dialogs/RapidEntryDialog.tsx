import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Learner } from '@/lib/types';
import { ArrowRight, Check, Calculator } from 'lucide-react';
import { parseMarkInput } from '@/utils/marks';
import { showSuccess } from '@/utils/toast';

interface RapidEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateMark: (index: number, mark: string) => void;
}

export const RapidEntryDialog = ({ open, onOpenChange, learners, onUpdateMark }: RapidEntryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMark, setCurrentMark] = useState('');

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setCurrentMark(learners[0]?.mark || '');
    }
  }, [open, learners]);

  useEffect(() => {
    if (learners[currentIndex]) {
        setCurrentMark(learners[currentIndex].mark || '');
    }
  }, [currentIndex, learners]);

  const handleNext = () => {
    // Parse input before saving
    const { value, isCalculated, raw } = parseMarkInput(currentMark);
    
    if (isCalculated) {
        showSuccess(`Calculated: ${raw} = ${value}%`);
    }

    onUpdateMark(currentIndex, value);
    
    if (currentIndex < learners.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  const progress = Math.round(((currentIndex + 1) / learners.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rapid Mark Entry</DialogTitle>
          <DialogDescription>
            Quickly enter marks one by one. Supports calculations (e.g. "15/20").
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-right text-muted-foreground">
                {currentIndex + 1} of {learners.length}
            </p>

            <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <h3 className="text-2xl font-bold">{learners[currentIndex]?.name}</h3>
                <div className="flex items-center gap-2 relative">
                    <Label htmlFor="rapid-mark" className="sr-only">Mark</Label>
                    <Input 
                        id="rapid-mark"
                        value={currentMark}
                        onChange={(e) => setCurrentMark(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-center text-lg w-32 h-12"
                        placeholder="%"
                        autoFocus
                    />
                    {currentMark.includes('/') && (
                        <div className="absolute -right-8 text-muted-foreground animate-in fade-in">
                            <Calculator className="h-5 w-5" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleNext}>
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