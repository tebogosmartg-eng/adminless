import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface VoiceEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
  onUpdateMark: (index: number, mark: string) => void;
  maxMark?: number;
}

export const VoiceEntryDialog = ({ open, onOpenChange, learners, onUpdateMark, maxMark }: VoiceEntryDialogProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [history, setHistory] = useState<{name: string, mark: string, time: string}[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
          if (isListening && open) {
              recognition.start();
          } else {
              setIsListening(false);
          }
      };
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            processCommand(text);
          } else {
             currentTranscript = text;
          }
        }
        setTranscript(currentTranscript);
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
  }, [open, isListening]);

  useEffect(() => {
      if (!open) {
          if (isListening && recognitionRef.current) recognitionRef.current.stop();
          setTranscript('');
          processedRef.current.clear();
      }
  }, [open]);

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    if (!lowerCommand) return;

    if (processedRef.current.has(lowerCommand)) return;
    processedRef.current.add(lowerCommand);

    let matchedLearnerIndex = -1;
    let bestMatchLen = 0;

    learners.forEach((l, idx) => {
        const nameLower = l.name.toLowerCase();
        const regex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerCommand) && nameLower.length > bestMatchLen) {
            matchedLearnerIndex = idx;
            bestMatchLen = nameLower.length;
        }
    });

    if (matchedLearnerIndex !== -1) {
        const remainder = lowerCommand.replace(learners[matchedLearnerIndex].name.toLowerCase(), '');
        const numbers = remainder.match(/\d+/);
        
        if (numbers) {
            const markStr = numbers[0];
            const markNum = parseFloat(markStr);

            if (markNum < 0) {
                showError("Negative marks cannot be recorded via voice.");
                return;
            }

            if (maxMark && markNum > maxMark) {
                showError(`Dictated mark (${markNum}) exceeds assessment total (${maxMark}).`);
                return;
            }

            onUpdateMark(matchedLearnerIndex, markStr);
            
            const entry = {
                name: learners[matchedLearnerIndex].name,
                mark: markStr,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setHistory(prev => [entry, ...prev].slice(0, 10));
            showSuccess(`Recorded: ${entry.name} = ${markStr}`);
        }
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
        setIsListening(true);
        setTimeout(() => {
            const mockName = learners[0]?.name || "John Doe";
            processCommand(`${mockName} 85`);
            setIsListening(false);
        }, 1500);
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className={`h-5 w-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
            Voice Entry Mode
          </DialogTitle>
          <DialogDescription>
            Dictate marks for learners. {maxMark && `Total marks: ${maxMark}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {!isSupported && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs w-full">
                  <AlertCircle className="h-4 w-4" /> Browser not supported. Using simulation mode.
              </div>
          )}

          <div className={`p-8 rounded-full transition-all duration-500 cursor-pointer border-4 ${
              isListening 
                ? 'bg-red-50 border-red-200 scale-110 shadow-lg shadow-red-100' 
                : 'bg-muted border-transparent'
          }`} onClick={toggleListening}>
            {isListening ? (
                <Mic className="h-12 w-12 text-red-500" />
            ) : (
                <MicOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          
          <div className="text-center space-y-1">
              <Button 
                onClick={toggleListening} 
                variant={isListening ? "destructive" : "default"}
                className="w-48"
              >
                {isListening ? "Stop Microphone" : "Start Listening"}
              </Button>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {isListening ? "Listening for commands..." : "Click to begin dictation"}
              </p>
          </div>

          <div className="w-full bg-muted/30 rounded-lg p-3 min-h-[4rem] flex flex-col items-center justify-center border border-dashed">
            {transcript ? (
               <p className="text-sm italic text-foreground text-center">"{transcript}"</p>
            ) : (
               <p className="text-xs text-muted-foreground text-center">
                   Example: "{learners[0]?.name || 'Learner Name'} 75"
               </p>
            )}
          </div>

          <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <History className="h-3 w-3" />
                  Recently Captured
              </div>
              <ScrollArea className="h-32 border rounded-md bg-background">
                  {history.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                          No marks recorded yet...
                      </div>
                  ) : (
                      <div className="p-2 space-y-1">
                          {history.map((item, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20 border-b last:border-0 animate-in slide-in-from-left-2">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span className="text-sm font-medium">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="font-bold">{item.mark}%</Badge>
                                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};