import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';

interface VoiceEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateMark: (index: number, mark: string) => void;
}

export const VoiceEntryDialog = ({ open, onOpenChange, learners, onUpdateMark }: VoiceEntryDialogProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            processCommand(event.results[i][0].transcript);
          } else {
             setTranscript(event.results[i][0].transcript);
          }
        }
        if (finalTranscript) {
           setTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
            showError("Microphone access denied.");
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
      if (!open && isListening && recognitionRef.current) {
          recognitionRef.current.stop();
      }
      if (open && !isListening) {
          setTranscript('');
      }
  }, [open]);

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    // Pattern: [Learner Name] [Mark] (maybe "percent" at end)
    // Heuristic: Last word is number? Or try to fuzzy match name?
    
    // Simplest approach: Try to find a learner name at start
    // Then find numbers after it.
    
    let matchedLearnerIndex = -1;
    let bestMatchLen = 0;

    learners.forEach((l, idx) => {
        const nameLower = l.name.toLowerCase();
        if (lowerCommand.includes(nameLower) && nameLower.length > bestMatchLen) {
            matchedLearnerIndex = idx;
            bestMatchLen = nameLower.length;
        }
    });

    if (matchedLearnerIndex !== -1) {
        // Extract number from the rest of the string
        // e.g. "set mark for john doe to eighty five"
        // e.g. "john doe 85"
        
        // Remove name
        const remainder = lowerCommand.replace(learners[matchedLearnerIndex].name.toLowerCase(), '');
        
        // Find numbers
        const numbers = remainder.match(/\d+/);
        if (numbers) {
            onUpdateMark(matchedLearnerIndex, numbers[0]);
            showSuccess(`Matched: ${learners[matchedLearnerIndex].name} = ${numbers[0]}`);
        } else {
            // Try word-to-number if needed, or simple regex failed
             // NOTE: webkitSpeechRecognition usually returns "85" for "eighty five"
        }
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
        // Fallback simulation
        setIsListening(true);
        setTimeout(() => {
            setTranscript("Simulated: " + learners[0]?.name + " 85");
            if(learners.length > 0) onUpdateMark(0, "85");
            setIsListening(false);
        }, 1500);
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voice Mark Entry</DialogTitle>
          <DialogDescription>
            Speak to set marks. Example: "{learners[0]?.name || 'John'} 85"
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          {!isSupported && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                  <AlertCircle className="h-4 w-4" /> Browser not supported. Using simulation mode.
              </div>
          )}

          <div className={`p-6 rounded-full transition-colors ${isListening ? 'bg-red-100 animate-pulse' : 'bg-muted'}`}>
            {isListening ? (
                <Mic className="h-12 w-12 text-red-500" />
            ) : (
                <MicOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          
          <Button onClick={toggleListening} variant={isListening ? "destructive" : "default"}>
            {isListening ? "Stop Listening" : "Start Listening"}
          </Button>

          <div className="min-h-[3rem] w-full text-center p-2 border rounded bg-muted/20">
            {transcript ? (
               <p className="text-sm italic text-foreground">"{transcript}"</p>
            ) : (
               <p className="text-xs text-muted-foreground">Transcript will appear here...</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};