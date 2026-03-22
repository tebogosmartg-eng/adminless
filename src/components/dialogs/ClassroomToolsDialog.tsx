import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Learner } from '@/lib/types';
import { Users, Shuffle, Timer, Pause, Play, RotateCcw, Copy, Save, RefreshCw } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface ClassroomToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
}

export const ClassroomToolsDialog = ({ open, onOpenChange, learners }: ClassroomToolsDialogProps) => {
  // Random Picker State
  const [pickedLearner, setPickedLearner] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Group Generator State
  const [groupSize, setGroupSize] = useState(4);
  const [groups, setGroups] = useState<Learner[][]>([]);

  // Timer State
  const [time, setTime] = useState(300); // 5 minutes default
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(300);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Random Picker Logic ---
  const handlePickRandom = () => {
    if (learners.length === 0) return;
    setIsPicking(true);
    let counter = 0;
    const cycles = 20;
    
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * learners.length);
      setPickedLearner(learners[randomIdx].name);
      counter++;
      
      if (counter >= cycles) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 100);
  };

  // --- Group Generator Logic ---
  const handleGenerateGroups = () => {
    if (learners.length === 0) return;
    
    // Shuffle learners
    const shuffled = [...learners].sort(() => 0.5 - Math.random());
    const newGroups: Learner[][] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      newGroups.push(shuffled.slice(i, i + groupSize));
    }
    
    setGroups(newGroups);
  };

  const handleSaveGroups = () => {
    // Temporary local state persistence
    showSuccess("Groups successfully saved for this session.");
  };

  const copyGroups = () => {
    const text = groups.map((g, i) => `Group ${i + 1}\n${g.map(l => `• ${l.name}`).join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showSuccess("Groups copied to clipboard!");
  };

  // --- Timer Logic ---
  useEffect(() => {
    if (isActive && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, time]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTime(initialTime);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setCustomTime = (minutes: number) => {
    setIsActive(false);
    setInitialTime(minutes * 60);
    setTime(minutes * 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] h-[80vh] flex flex-col p-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b shrink-0 bg-background">
            <DialogHeader>
            <DialogTitle>Classroom Tools</DialogTitle>
            <DialogDescription>Utilities for classroom management and activities.</DialogDescription>
            </DialogHeader>
        </div>

        {/* Fixed Tabs Container */}
        <Tabs defaultValue="picker" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 border-b bg-muted/10 shrink-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="picker"><Shuffle className="mr-2 h-4 w-4" /> Random Picker</TabsTrigger>
                <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> Groups</TabsTrigger>
                <TabsTrigger value="timer"><Timer className="mr-2 h-4 w-4" /> Timer</TabsTrigger>
              </TabsList>
          </div>

          {/* Random Picker Tab (Scrollable if needed, but flex-centered) */}
          <TabsContent value="picker" className="flex-1 min-h-0 data-[state=active]:flex flex-col items-center justify-center p-6 space-y-8 m-0 outline-none overflow-y-auto">
            <div className={`text-4xl font-bold text-center transition-all ${isPicking ? 'text-muted-foreground scale-90' : 'text-primary scale-110'}`}>
              {pickedLearner || "Ready to pick..."}
            </div>
            <Button size="lg" onClick={handlePickRandom} disabled={isPicking || learners.length === 0} className="w-48 h-14 text-lg">
               {isPicking ? "Choosing..." : "Pick Learner"}
            </Button>
            <p className="text-sm text-muted-foreground">Selects a random learner from the current class list.</p>
          </TabsContent>

          {/* Group Generator Tab (Fixed Header, Scrollable Content, Fixed Footer) */}
          <TabsContent value="groups" className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 outline-none">
             {/* Sticky Controls */}
             <div className="flex items-center justify-between p-4 border-b shrink-0 bg-background">
                <div className="flex items-center gap-3">
                   <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Group Size:</Label>
                   <Input 
                     type="number" 
                     min={2} 
                     max={learners.length} 
                     value={groupSize} 
                     onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)} 
                     className="w-20 font-bold text-center"
                   />
                </div>
                {groups.length === 0 && (
                    <Button onClick={handleGenerateGroups}>Generate Groups</Button>
                )}
             </div>
             
             {/* Scrollable Groups Area */}
             <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
               {groups.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, i) => (
                      <div key={i} className="border rounded-xl p-4 bg-card shadow-sm">
                         <h4 className="font-bold text-sm mb-3 text-primary border-b pb-2">Group {i + 1}</h4>
                         <ul className="space-y-1.5">
                            {group.map((l, j) => (
                              <li key={j} className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                                 <span className="text-primary/50 text-lg leading-none">•</span>
                                 {l.name}
                              </li>
                            ))}
                         </ul>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Users className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Click generate to create random groups.</p>
                 </div>
               )}
             </div>

             {/* Sticky Action Footer */}
             {groups.length > 0 && (
                <div className="p-4 border-t bg-background shrink-0 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={copyGroups} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-4 w-4 mr-2" /> Copy List
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleGenerateGroups}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                        </Button>
                        <Button size="sm" onClick={handleSaveGroups} className="bg-green-600 hover:bg-green-700 text-white">
                            <Save className="h-4 w-4 mr-2" /> Save Groups
                        </Button>
                    </div>
                </div>
             )}
          </TabsContent>

          {/* Timer Tab (Scrollable if needed, but flex-centered) */}
          <TabsContent value="timer" className="flex-1 min-h-0 data-[state=active]:flex flex-col items-center justify-center p-6 space-y-8 m-0 outline-none overflow-y-auto">
             <div className={`text-8xl font-mono font-bold tabular-nums tracking-wider ${time <= 10 && time > 0 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                {formatTime(time)}
             </div>
             
             <div className="flex gap-4">
                <Button size="lg" variant={isActive ? "secondary" : "default"} onClick={toggleTimer} className="w-32">
                   {isActive ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Start</>}
                </Button>
                <Button size="lg" variant="outline" onClick={resetTimer}>
                   <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
             </div>

             <div className="grid grid-cols-4 gap-2 w-full max-w-md">
                <Button variant="outline" size="sm" onClick={() => setCustomTime(1)}>1m</Button>
                <Button variant="outline" size="sm" onClick={() => setCustomTime(5)}>5m</Button>
                <Button variant="outline" size="sm" onClick={() => setCustomTime(10)}>10m</Button>
                <Button variant="outline" size="sm" onClick={() => setCustomTime(30)}>30m</Button>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};