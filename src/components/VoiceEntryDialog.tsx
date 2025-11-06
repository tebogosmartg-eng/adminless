import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, ArrowRight, Check } from 'lucide-react';
import { Learner } from './CreateClassDialog';
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

  const processTranscript = useCallback((text: string) => {
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const mark = numbers[0];
      const newLearners = [...updatedLearners];
      newLearners[currentLearnerIndex].mark = mark;
      setUpdatedLearners(newLearners);
      setTranscript(`Recognized mark: ${mark}`);
    } else {
      setTranscript(`Could not recognize a mark. Please try again.`);
    }
  }, [currentLearnerIndex, updatedLearners]);

  const handleListen = useCallback(() => {
    if (!isSupported || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('Listening...');
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      processTranscript(speechResult);
    };

    recognition.onerror = (event: any) => {
      showError(`Speech recognition error: ${event.error}`);
      setTranscript('Error listening. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, processTranscript]);

  const handleNext = () => {
    if (currentLearnerIndex < updatedLearners.length - 1) {
      setCurrentLearnerIndex(currentLearnerIndex + 1);
      setTranscript('');
    }
  };

  const handleFinish = () => {
    onComplete(updatedLearners);
    showSuccess('All marks have been updated!');
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Mark Entry</DialogTitle>
          <DialogDescription>
            Click the microphone and say the mark for the learner.
          </DialogDescription>
        </DialogHeader>
        {currentLearner ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Current Learner ({currentLearnerIndex + 1}/{updatedLearners.length})</p>
            <h3 className="text-2xl font-semibold my-2">{currentLearner.name}</h3>
            <p className="text-lg font-bold text-primary">{currentLearner.mark || 'No mark yet'}</p>
            
            <div className="my-6">
              <Button onClick={handleListen} size="lg" className="rounded-full h-20 w-20" disabled={isListening}>
                {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
            </div>
            
            <p className="min-h-[24px] text-muted-foreground">{transcript}</p>
          </div>
        ) : (
           <div className="py-4 text-center">
            <h3 className="text-xl font-semibold">All learners are marked.</h3>
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          {currentLearnerIndex < updatedLearners.length - 1 ? (
            <Button onClick={handleNext} variant="outline">
              Next Learner <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div /> 
          )}
          <Button onClick={handleFinish}>
            Finish & Save <Check className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};