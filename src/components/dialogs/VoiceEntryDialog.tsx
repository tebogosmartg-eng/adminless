import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Learner } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

interface VoiceEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learners: Learner[];
  onComplete: (updatedLearners: Learner[]) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSupported = !!SpeechRecognition;

export const VoiceEntryDialog = ({ isOpen, onOpenChange, learners, onComplete }: VoiceEntryDialogProps) => {
  const [currentLearnerIndex, setCurrentLearnerIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [updatedLearners, setUpdatedLearners] = useState<Learner[]>([]);

  useEffect(() => {
    if (isOpen) {
      setUpdatedLearners([...learners]);
      setCurrentLearnerIndex(0);
      setTranscript('');
    }
  }, [isOpen, learners]);

  const handleNext = useCallback(() => {
    if (currentLearnerIndex < updatedLearners.length - 1) {
      setCurrentLearnerIndex(prev => prev + 1);
      setTranscript('Next learner...');
    } else {
      setTranscript('This is the last learner.');
    }
  }, [currentLearnerIndex, updatedLearners.length]);

  const handlePrevious = useCallback(() => {
    if (currentLearnerIndex > 0) {
      setCurrentLearnerIndex(prev => prev - 1);
      setTranscript('Previous learner...');
    }
  }, [currentLearnerIndex]);

  const processTranscript = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();

    // Voice Commands
    if (lowerText === 'next' || lowerText === 'skip' || lowerText.includes('next learner')) {
      handleNext();
      return;
    }
    
    if (lowerText === 'back' || lowerText === 'previous' || lowerText.includes('go back')) {
      handlePrevious();
      return;
    }

    if (lowerText === 'stop' || lowerText === 'finish' || lowerText === 'done') {
      setIsListening(false);
      setTranscript('Stopped listening.');
      return;
    }

    // Number parsing for marks
    const numbers = text.match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length > 0) {
      // Take the last number heard as the correction usually comes last
      const mark = numbers[numbers.length - 1]; 
      
      const newLearners = [...updatedLearners];
      newLearners[currentLearnerIndex].mark = mark;
      setUpdatedLearners(newLearners);
      
      setTranscript(`Mark recorded: ${mark}`);
      
      // Optional: Auto-advance after a short delay if a mark was found
      // setTimeout(() => handleNext(), 1500); 
    } else {
      setTranscript(`"${text}" - Say a number, or "Next"/"Back"`);
    }
  }, [currentLearnerIndex, updatedLearners, handleNext, handlePrevious]);

  const handleListen = useCallback(() => {
    if (!isSupported || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('Listening... Say a mark, "Next", or "Back".');
    };

    recognition.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const speechResult = event.results[lastResultIndex][0].transcript;
      processTranscript(speechResult);
    };

    recognition.onerror = (event: any) => {
      // Don't show toast for 'no-speech' errors as they are common in continuous mode
      if (event.error !== 'no-speech') {
        showError(`Microphone error: ${event.error}`);
        setTranscript('Error. Click mic to try again.');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If we didn't manually stop, restart (for continuous feel) unless closed
      if (isListening && isOpen) {
         try {
           recognition.start();
         } catch (e) {
           setIsListening(false);
         }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }, [isListening, isOpen, processTranscript]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Actual stop happens in onend or by browser
      // We force a state update to reflect UI immediately
    } else {
      handleListen();
    }
  };

  const handleFinish = () => {
    onComplete(updatedLearners);
    showSuccess('All marks have been updated!');
    setIsListening(false);
    onOpenChange(false);
  };

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice Entry Not Supported</DialogTitle>
            <DialogDescription>
              Your browser does not support the Web Speech API. Please try a different browser like Chrome or Edge.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  
  const currentLearner = updatedLearners[currentLearnerIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setIsListening(false);
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Mark Entry</DialogTitle>
          <DialogDescription>
             Click the mic. Say the mark (e.g., "75"). Say "Next" or "Back" to navigate.
          </DialogDescription>
        </DialogHeader>
        {currentLearner ? (
          <div className="py-4 text-center">
            <div className="flex justify-between items-center mb-4">
              <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={currentLearnerIndex === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentLearnerIndex + 1} of {updatedLearners.length}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentLearnerIndex === updatedLearners.length - 1}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <h3 className="text-3xl font-bold my-4">{currentLearner.name}</h3>
            
            <div className="flex items-center justify-center gap-4 my-6">
               <div className="bg-muted px-6 py-3 rounded-lg min-w-[100px]">
                 <p className="text-sm text-muted-foreground uppercase tracking-wider">Current Mark</p>
                 <p className="text-3xl font-bold text-primary">{currentLearner.mark || '-'}</p>
               </div>
            </div>
            
            <div className="my-6">
              <Button 
                onClick={toggleListening} 
                size="lg" 
                className={`rounded-full h-20 w-20 transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-200' : ''}`}
              >
                {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
            </div>
            
            <div className="min-h-[24px] bg-muted/30 p-2 rounded-md">
              <p className="text-sm text-muted-foreground italic">{transcript || "Ready to listen..."}</p>
            </div>
          </div>
        ) : (
           <div className="py-4 text-center">
            <h3 className="text-xl font-semibold">Done.</h3>
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground self-center hidden sm:block">
            Pro tip: You can say "Next" or "Back"
          </div>
          <Button onClick={handleFinish}>
            Finish & Save <Check className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};