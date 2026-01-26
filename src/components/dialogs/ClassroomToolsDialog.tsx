import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Learner } from '@/lib/types';
import { Users, Shuffle, Timer, Pause, Play, RotateCcw, Copy } from 'lucide-react';
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

  const copyGroups = () => {
    const text = groups.map((g, i) => `Group ${i + 1}: ${g.map(l => l.name).join(', ')}`).join('\n');
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
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Classroom Tools</DialogTitle>
          <DialogDescription>Utilities for classroom management and activities.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="picker" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="picker"><Shuffle className="mr-2 h-4 w-4" /> Random Picker</TabsTrigger>
            <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> Groups</TabsTrigger>
            <TabsTrigger value="timer"><Timer className="mr-2 h-4 w-4" /> Timer</TabsTrigger>
          </TabsList>

          {/* Random Picker Tab */}
          <TabsContent value="picker" className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <div className={`text-4xl font-bold text-center transition-all ${isPicking ? 'text-muted-foreground scale-90' : 'text-primary scale-110'}`}>
              {pickedLearner || "Ready to pick..."}
            </div>
            <Button size="lg" onClick={handlePickRandom} disabled={isPicking || learners.length === 0} className="w-48 h-14 text-lg">
               {isPicking ? "Choosing..." : "Pick Student"}
            </Button>
            <p className="text-sm text-muted-foreground">Selects a random student from the current class list.</p>
          </TabsContent>

          {/* Group Generator Tab */}
          <TabsContent value="groups" className="flex-1 flex flex-col overflow-hidden">
             <div className="flex items-center gap-4 p-4 border-b">
                <div className="flex items-center gap-2">
                   <Label>Group Size:</Label>
                   <Input 
                     type="number" 
                     min={2} 
                     max={learners.length} 
                     value={groupSize} 
                     onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)} 
                     className="w-20"
                   />
                </div>
                <Button onClick={handleGenerateGroups}>Generate Groups</Button>
                {groups.length > 0 && (
                  <Button variant="outline" size="icon" onClick={copyGroups} title="Copy to Clipboard">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
             </div>
             
             <div className="flex-1 overflow-auto p-4">
               {groups.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-muted/20">
                         <h4 className="font-bold text-sm mb-2 text-primary">Group {i + 1}</h4>
                         <ul className="list-disc list-inside text-sm space-y-1">
                            {group.map((l, j) => (
                              <li key={j}>{l.name}</li>
                            ))}
                         </ul>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-20" />
                    <p>Click generate to create random groups.</p>
                 </div>
               )}
             </div>
          </TabsContent>

          {/* Timer Tab */}
          <TabsContent value="timer" className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
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