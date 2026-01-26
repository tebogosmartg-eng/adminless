import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess } from '@/utils/toast';

interface VoiceEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateMark: (index: number, mark: string) => void;
}

export const VoiceEntryDialog = ({ open, onOpenChange, learners, onUpdateMark }: VoiceEntryDialogProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Mock voice recognition for demo
  useEffect(() => {
    if (!open) {
        setIsListening(false);
        setTranscript('');
    }
  }, [open]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate recognition
      setTimeout(() => {
        setTranscript("Setting mark for " + learners[0]?.name + " to 85");
        if (learners.length > 0) {
            onUpdateMark(0, "85");
            showSuccess(`Voice command recognized: Mark 85 for ${learners[0].name}`);
        }
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voice Mark Entry</DialogTitle>
          <DialogDescription>
            Speak to set marks. Example: "John Doe 85 percent"
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          <div className={`p-6 rounded-full transition-colors ${isListening ? 'bg-red-100' : 'bg-muted'}`}>
            {isListening ? (
                <Mic className="h-12 w-12 text-red-500 animate-pulse" />
            ) : (
                <MicOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          
          <Button onClick={toggleListening} variant={isListening ? "destructive" : "default"}>
            {isListening ? "Stop Listening" : "Start Listening"}
          </Button>

          {transcript && (
            <p className="text-sm text-muted-foreground italic">
              "{transcript}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};