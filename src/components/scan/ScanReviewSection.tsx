import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, PlusCircle, Eye, AlertCircle, Info, Calculator, ShieldAlert, UserPlus, Link2, Link2Off, CheckCircle2 } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface ScanReviewSectionProps {
  scannedDetails: ScannedDetails | null;
  scannedLearners: ScannedLearner[];
  learnerMappings: Record<number, string>;
  updateLearnerMapping: (scannedIdx: number, learnerId: string) => void;
  classes: ClassInfo[];
  selectedClassId: string | undefined;
  setSelectedClassId: (id: string) => void;
  newClassName: string;
  setNewClassName: (name: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDetailsChange: (field: keyof ScannedDetails, value: string) => void;
  onLearnerChange: (index: number, field: keyof ScannedLearner, value: any) => void;
  onSaveToExisting: () => void;
  onCreateNew: () => void;
  imagePreviews?: string[];
  availableAssessments?: Assessment[];
  selectedAssessmentId?: string;
  setSelectedAssessmentId?: (id: string) => void;
}

export const ScanReviewSection = ({
  scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
  classes, selectedClassId, setSelectedClassId,
  newClassName, setNewClassName, activeTab, setActiveTab, onDetailsChange, onLearnerChange,
  onSaveToExisting, onCreateNew, imagePreviews = [], availableAssessments = [],
  selectedAssessmentId, setSelectedAssessmentId
}: ScanReviewSectionProps) => {

  const questionHeaders = useMemo(() => {
    const qNums = new Set<string>();
    scannedLearners.forEach(l => l.questionMarks?.forEach(q => qNums.add(q.num)));
    return Array.from(qNums).sort((a, b) => parseInt(a) - parseInt(b));
  }, [scannedLearners]);

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const handleQMarkChange = (lIdx: number, qNum: string, val: string) => {
      const qMarks = [...(scannedLearners[lIdx].questionMarks || [])];
      const qIdx = qMarks.findIndex(q => q.num === qNum);
      if (qIdx !== -1) qMarks[qIdx] = { ...qMarks[qIdx], score: val };
      else qMarks.push({ num: qNum, score: val });
      onLearnerChange(lIdx, 'questionMarks', qMarks);
  };

  // Check if a learner is already mapped to avoid duplicates
  const isIdMapped = (id: string, currentIdx: number) => {
      return Object.entries(learnerMappings).some(([idx, mappedId]) => mappedId === id && parseInt(idx) !== currentIdx);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-none">
      <CardHeader className="flex-shrink-0 border-b bg-muted/10">
        <div className="flex items-center justify-between">
            <CardTitle className="text-lg">2. Data Verification</CardTitle>
            {imagePreviews.length > 0 && (
                <Dialog>
                    <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8"><Eye className="mr-2 h-3 w-3" /> View Proof</Button></DialogTrigger>
                    <DialogContent className="max-w-4xl h-[85vh] overflow-auto flex flex-col items-center gap-4 bg-muted/20 p-4">
                        {imagePreviews.map((src, idx) => <img key={idx} src={src} alt="Proof" className="max-w-full rounded shadow border" />)}
                    </DialogContent>
                </Dialog>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {scannedDetails && scannedLearners.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/10">
                <div className="col-span-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Task Details</Label></div>
                <Input value={scannedDetails.testNumber} onChange={(e) => onDetailsChange('testNumber', e.target.value)} className="h-8 text-xs font-bold" placeholder="Task Name" />
                <Input value={scannedDetails.subject} onChange={(e) => onDetailsChange('subject', e.target.value)} className="h-8 text-xs" placeholder="Subject" />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="update" className="text-[10px] uppercase font-bold">Save to Class</TabsTrigger>
                  <TabsTrigger value="create" className="text-[10px] uppercase font-bold">New Class</TabsTrigger>
                </TabsList>
                
                <div className="pt-3">
                  {activeTab === 'update' ? (
                    <div className="grid grid-cols-2 gap-3">
                        <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target Class..." /></SelectTrigger>
                            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select onValueChange={setSelectedAssessmentId} value={selectedAssessmentId} disabled={!selectedClassId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assessment..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">+ New Formal Task</SelectItem>
                                {availableAssessments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  ) : (
                    <Input placeholder="Class Name..." value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="h-8 text-xs" />
                  )}
                </div>
              </Tabs>

              <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
                <Table className="min-w-[500px]">
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-8 h-9 py-0"></TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black">SCANNED NAME</TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black w-36">ROSTER LINK</TableHead>
                        {questionHeaders.map(num => <TableHead key={num} className="text-center text-[10px] h-9 py-0 w-12 font-black">Q{num}</TableHead>)}
                        <TableHead className="text-right text-[10px] h-9 py-0 w-16 font-black">MARK</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {scannedLearners.map((learner, index) => {
                        const qSum = (learner.questionMarks || []).reduce((acc, q) => acc + (parseFloat(q.score) || 0), 0);
                        const total = parseFloat(learner.mark) || 0;
                        const hasDiscrepancy = (learner.questionMarks?.length ?? 0) > 0 && qSum !== total;
                        
                        const mappedId = learnerMappings[index];
                        const isMapped = !!mappedId;

                        return (
                            <TableRow key={index} className={cn("hover:bg-muted/20 h-11", !isMapped && activeTab === 'update' && "bg-amber-50/30", hasDiscrepancy && "bg-red-50/50")}>
                            <TableCell className="p-0 text-center">
                                {isMapped ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                                )}
                            </TableCell>
                            <TableCell className="py-1 px-2">
                                <Input
                                    value={learner.name}
                                    onChange={(e) => onLearnerChange(index, 'name', e.target.value)}
                                    className="h-7 text-xs border-transparent bg-transparent focus:bg-background"
                                />
                            </TableCell>
                            <TableCell className="py-1 px-1">
                                {activeTab === 'update' && targetClass ? (
                                    <Select 
                                        value={mappedId || "unlinked"} 
                                        onValueChange={(val) => updateLearnerMapping(index, val)}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-7 text-[10px] py-0 border-none bg-muted/20",
                                            !isMapped && "text-amber-700 font-bold"
                                        )}>
                                            <SelectValue placeholder="Link..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unlinked" className="text-muted-foreground italic text-[10px]">Unmatched Learner</SelectItem>
                                            <DropdownMenuSeparator />
                                            {targetClass.learners.map(l => (
                                                <SelectItem 
                                                    key={l.id} 
                                                    value={l.id!}
                                                    className={cn(isIdMapped(l.id!, index) && "opacity-50 line-through")}
                                                    disabled={isIdMapped(l.id!, index)}
                                                >
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Auto-linked</span>
                                )}
                            </TableCell>
                            {questionHeaders.map(num => {
                                const qMark = (learner.questionMarks || []).find(q => q.num === num);
                                return (
                                    <TableCell key={num} className="py-1 px-1">
                                        <Input
                                            value={qMark?.score || ""}
                                            onChange={(e) => handleQMarkChange(index, num, e.target.value)}
                                            className="h-7 text-center text-[11px] border-transparent bg-transparent"
                                        />
                                    </TableCell>
                                );
                            })}
                            <TableCell className="py-1 relative px-2">
                                <Input
                                    value={learner.mark}
                                    onChange={(e) => onLearnerChange(index, 'mark', e.target.value)}
                                    className={cn("h-7 text-[11px] text-right border-transparent bg-transparent pr-5", hasDiscrepancy && "text-red-700 font-black")}
                                />
                                {hasDiscrepancy && (
                                    <TooltipProvider><Tooltip>
                                        <TooltipTrigger className="absolute right-0.5 top-1/2 -translate-y-1/2"><ShieldAlert className="h-3 w-3 text-red-500" /></TooltipTrigger>
                                        <TooltipContent className="text-[10px]">Sum of questions ({qSum}) ≠ Total ({total})</TooltipContent>
                                    </Tooltip></TooltipProvider>
                                )}
                            </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
              </div>
            </div>

            <div className="p-4 border-t bg-background mt-auto flex flex-col gap-3">
              {activeTab === 'update' && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100">
                      <Info className="h-3.5 w-3.5" />
                      <span>Learners with <AlertCircle className="inline h-3 w-3" /> will be skipped unless linked to a roster name.</span>
                  </div>
              )}
              
              {activeTab === 'update' ? (
                <Button onClick={onSaveToExisting} disabled={!selectedClassId} className="w-full h-12 font-black shadow-lg">
                  <Save className="mr-2 h-4 w-4" /> Commit Scanned Marks
                </Button>
              ) : (
                <Button onClick={onCreateNew} disabled={!newClassName} className="w-full h-12 font-black shadow-lg">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create & Save
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12">
            <Calculator className="h-12 w-12 opacity-10 mb-4" />
            <h3 className="font-bold text-foreground opacity-60">Review Pipeline</h3>
            <p className="text-[10px] uppercase font-black tracking-widest mt-1">Extraction pending</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';