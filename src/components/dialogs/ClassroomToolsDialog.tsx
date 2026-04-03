import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Learner } from '@/lib/types';
import { Users, Shuffle, Timer, Pause, Play, RotateCcw, Copy, Save, RefreshCw, BrainCircuit, AlertCircle } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface ClassroomToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learners: Learner[];
}

export const ClassroomToolsDialog = ({ open, onOpenChange, learners }: ClassroomToolsDialogProps) => {
  const [pickedLearner, setPickedLearner] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const [groupMode, setGroupMode] = useState<'random' | 'smart'>('random');
  const [balancePerformance, setBalancePerformance] = useState(false);
  const [balanceGender, setBalanceGender] = useState(false);
  const [groupWarning, setGroupWarning] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [groups, setGroups] = useState<Learner[][]>([]);

  const [time, setTime] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(300);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const generateRandomGroups = () => {
    const shuffled = [...learners].sort(() => 0.5 - Math.random());
    const newGroups: Learner[][] = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
      newGroups.push(shuffled.slice(i, i + groupSize));
    }
    setGroups(newGroups);
  };

  const handleGenerateGroups = () => {
    if (learners.length === 0) return;
    
    if (groupMode === 'smart' && (balancePerformance || balanceGender)) {
      const validMarksCount = learners.filter(l => l.mark && !isNaN(parseFloat(l.mark))).length;
      const hasPerformanceData = validMarksCount > 0;
      const hasGenderData = learners.some(l => l.gender);

      const canBalancePerf = balancePerformance && hasPerformanceData;
      const canBalanceGender = balanceGender && hasGenderData;

      if (!canBalancePerf && !canBalanceGender) {
          setGroupWarning("Balanced grouping unavailable — using random groups");
          generateRandomGroups();
          return;
      }

      const warnings = [];
      if (balancePerformance && !hasPerformanceData) warnings.push("No performance data found");
      if (balanceGender && !hasGenderData) warnings.push("No gender data found");
      
      if (warnings.length > 0) {
          setGroupWarning(`${warnings.join(' and ')} — applying available balancing.`);
      } else {
          setGroupWarning(null);
      }

      let pool = [...learners];
      let sortedLearners: Learner[] = [];

      if (canBalanceGender) {
          const males = pool.filter(l => l.gender === 'Male');
          const females = pool.filter(l => l.gender === 'Female');
          const unk = pool.filter(l => l.gender !== 'Male' && l.gender !== 'Female');
          
          const sortFn = canBalancePerf 
              ? (a: Learner, b: Learner) => (parseFloat(b.mark) || 0) - (parseFloat(a.mark) || 0)
              : () => 0.5 - Math.random();
          
          males.sort(sortFn);
          females.sort(sortFn);
          unk.sort(sortFn);

          const maxLen = Math.max(males.length, females.length, unk.length);
          for (let i = 0; i < maxLen; i++) {
              if (females[i]) sortedLearners.push(females[i]);
              if (males[i]) sortedLearners.push(males[i]);
              if (unk[i]) sortedLearners.push(unk[i]);
          }
      } else {
          if (canBalancePerf) {
              sortedLearners = pool.sort((a, b) => (parseFloat(b.mark) || 0) - (parseFloat(a.mark) || 0));
          } else {
              sortedLearners = pool.sort(() => 0.5 - Math.random());
          }
      }

      const numGroups = Math.ceil(sortedLearners.length / groupSize);
      const newGroups: Learner[][] = Array.from({ length: numGroups }, () => []);

      sortedLearners.forEach((learner, index) => {
        const round = Math.floor(index / numGroups);
        const remainder = index % numGroups;
        const groupIndex = round % 2 === 0 ? remainder : numGroups - 1 - remainder;
        newGroups[groupIndex].push(learner);
      });

      setGroups(newGroups);
    } else {
      setGroupWarning(null);
      generateRandomGroups();
    }
  };

  const handleSaveGroups = () => {
    showSuccess("Groups successfully saved for this session.");
  };

  const copyGroups = () => {
    const text = groups.map((g, i) => `Group ${i + 1}\n${g.map(l => `• ${l.name}`).join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showSuccess("Groups copied to clipboard!");
  };

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
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] h-[90vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <div className="p-4 sm:p-6 pb-4 border-b shrink-0 bg-background">
            <DialogHeader>
            <DialogTitle>Classroom Tools</DialogTitle>
            <DialogDescription>Utilities for classroom management and activities.</DialogDescription>
            </DialogHeader>
        </div>

        <Tabs defaultValue="picker" className="flex-1 flex flex-col min-h-0 bg-muted/5">
          <div className="px-2 sm:px-6 py-2 border-b bg-background shrink-0">
              <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start sm:justify-center p-1 h-auto min-h-[48px]">
                <TabsTrigger value="picker" className="flex-none shrink-0 h-10 px-4"><Shuffle className="mr-2 h-4 w-4" /> Random Picker</TabsTrigger>
                <TabsTrigger value="groups" className="flex-none shrink-0 h-10 px-4"><Users className="mr-2 h-4 w-4" /> Groups</TabsTrigger>
                <TabsTrigger value="timer" className="flex-none shrink-0 h-10 px-4"><Timer className="mr-2 h-4 w-4" /> Timer</TabsTrigger>
              </TabsList>
          </div>

          <TabsContent value="picker" className="flex-1 min-h-0 data-[state=active]:flex flex-col items-center justify-center p-6 space-y-8 m-0 outline-none overflow-y-auto">
            <div className={`text-3xl md:text-4xl font-bold text-center transition-all ${isPicking ? 'text-muted-foreground scale-90' : 'text-primary scale-110'}`}>
              {pickedLearner || "Ready to pick..."}
            </div>
            <Button size="lg" onClick={handlePickRandom} disabled={isPicking || learners.length === 0} className="w-full sm:w-48 h-14 text-lg">
               {isPicking ? "Choosing..." : "Pick Learner"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">Selects a random learner from the current class list.</p>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 outline-none">
             <div className="flex flex-col gap-3 p-4 border-b shrink-0 bg-background z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit border">
                        <Button 
                            variant={groupMode === 'random' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setGroupMode('random')}
                            className="h-8 text-xs shadow-none"
                        >
                            Random
                        </Button>
                        <Button 
                            variant={groupMode === 'smart' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setGroupMode('smart')}
                            className="h-8 text-xs gap-1.5 shadow-none"
                        >
                            <BrainCircuit className="h-3 w-3" /> Smart
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Size:</Label>
                       <Input 
                         type="number" 
                         min={2} 
                         max={learners.length} 
                         value={groupSize} 
                         onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)} 
                         className="w-16 font-bold text-center h-9"
                       />
                    </div>
                </div>

                {groupMode === 'smart' && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 animate-in slide-in-from-top-1 bg-primary/5 px-4 py-2.5 rounded-md border border-primary/10">
                        <div className="flex items-center gap-2">
                            <Checkbox id="bal-perf" checked={balancePerformance} onCheckedChange={(c) => setBalancePerformance(!!c)} className="h-5 w-5" />
                            <Label htmlFor="bal-perf" className="text-xs cursor-pointer font-semibold text-primary/90">Balance by performance</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="bal-gender" checked={balanceGender} onCheckedChange={(c) => setBalanceGender(!!c)} className="h-5 w-5" />
                            <Label htmlFor="bal-gender" className="text-xs cursor-pointer font-semibold text-primary/90">Balance by gender</Label>
                        </div>
                    </div>
                )}
                
                {groupWarning && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {groupWarning}
                    </div>
                )}

                {groups.length === 0 && (
                    <Button onClick={handleGenerateGroups} className="w-full mt-1 h-10 font-bold">Generate Groups</Button>
                )}
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
               {groups.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, i) => (
                      <div key={i} className="border rounded-xl p-4 bg-card shadow-sm">
                         <div className="flex items-center justify-between border-b pb-2 mb-3">
                            <h4 className="font-bold text-sm text-primary">Group {i + 1}</h4>
                            <span className="text-[10px] text-muted-foreground font-bold">{group.length} Members</span>
                         </div>
                         <ul className="space-y-1.5">
                            {group.map((l, j) => (
                              <li key={j} className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                                 <span className="text-primary/50 text-lg leading-none">•</span>
                                 <span className="truncate">{l.name}</span>
                              </li>
                            ))}
                         </ul>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 text-center">
                    <Users className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium px-4">Click generate to create {groupMode === 'smart' ? 'balanced' : 'random'} groups.</p>
                 </div>
               )}
             </div>

             {groups.length > 0 && (
                <div className="p-4 border-t bg-background shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button variant="ghost" size="sm" onClick={copyGroups} className="text-muted-foreground hover:text-foreground h-10 sm:h-9 w-full sm:w-auto">
                        <Copy className="h-4 w-4 mr-2" /> Copy List
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={handleGenerateGroups} className="h-10 sm:h-9 flex-1 sm:flex-none">
                            <RefreshCw className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                        <Button size="sm" onClick={handleSaveGroups} className="bg-green-600 hover:bg-green-700 text-white h-10 sm:h-9 flex-1 sm:flex-none">
                            <Save className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Save</span>
                        </Button>
                    </div>
                </div>
             )}
          </TabsContent>

          <TabsContent value="timer" className="flex-1 min-h-0 data-[state=active]:flex flex-col items-center justify-center p-6 space-y-8 m-0 outline-none overflow-y-auto">
             <div className={`text-7xl sm:text-8xl font-mono font-bold tabular-nums tracking-wider ${time <= 10 && time > 0 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                {formatTime(time)}
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button size="lg" variant={isActive ? "secondary" : "default"} onClick={toggleTimer} className="w-full sm:w-32 h-14 text-lg font-bold">
                   {isActive ? <><Pause className="mr-2 h-5 w-5" /> Pause</> : <><Play className="mr-2 h-5 w-5" /> Start</>}
                </Button>
                <Button size="lg" variant="outline" onClick={resetTimer} className="w-full sm:w-32 h-14 text-lg font-bold">
                   <RotateCcw className="mr-2 h-5 w-5" /> Reset
                </Button>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md pt-4 border-t border-muted/50">
                <Button variant="outline" className="h-12 text-sm font-bold" onClick={() => setCustomTime(1)}>1 min</Button>
                <Button variant="outline" className="h-12 text-sm font-bold" onClick={() => setCustomTime(5)}>5 min</Button>
                <Button variant="outline" className="h-12 text-sm font-bold" onClick={() => setCustomTime(10)}>10 min</Button>
                <Button variant="outline" className="h-12 text-sm font-bold" onClick={() => setCustomTime(30)}>30 min</Button>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};