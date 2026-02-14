import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Eye, AlertCircle, Info, CheckCircle2, ShieldCheck, Database, ListChecks, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment, ScanType } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { useAcademic } from '@/context/AcademicContext';

interface ScanReviewSectionProps {
  scannedDetails: (ScannedDetails & { discoveredQuestions?: any[] }) | null;
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
  scanType?: ScanType;
}

export const ScanReviewSection = ({
  scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
  classes, selectedClassId, setSelectedClassId,
  newClassName, setNewClassName, activeTab, setActiveTab, onDetailsChange, onLearnerChange,
  onSaveToExisting, onCreateNew, imagePreviews = [], availableAssessments = [],
  selectedAssessmentId, setSelectedAssessmentId,
  scanType = 'class_marksheet'
}: ScanReviewSectionProps) => {

  const { activeTerm } = useAcademic();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // AUTO-EXPAND individual scripts for easier review
  useEffect(() => {
    if (scanType === 'individual_script' && scannedLearners.length > 0) {
        const next = new Set<number>();
        scannedLearners.forEach((l, i) => {
            if (l.questionMarks && l.questionMarks.length > 0) next.add(i);
        });
        setExpandedRows(next);
    }
  }, [scanType, scannedLearners.length]);

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const targetAssessment = useMemo(() => availableAssessments.find(a => a.id === selectedAssessmentId), [availableAssessments, selectedAssessmentId]);

  const isIdMapped = (id: string, currentIdx: number) => {
      return Object.entries(learnerMappings).some(([idx, mappedId]) => mappedId === id && parseInt(idx) !== currentIdx);
  };

  const isMarkMode = ['class_marksheet', 'individual_script'].includes(scanType);

  const toggleRow = (idx: number) => {
      const next = new Set(expandedRows);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      setExpandedRows(next);
  };

  const updateQuestionMark = (learnerIdx: number, qIdx: number, val: string) => {
      const updatedLearners = [...scannedLearners];
      const qMarks = [...(updatedLearners[learnerIdx].questionMarks || [])];
      qMarks[qIdx] = { ...qMarks[qIdx], score: val };
      
      // Auto-sum total
      let total = 0;
      qMarks.forEach(qm => total += parseFloat(qm.score) || 0);
      
      onLearnerChange(learnerIdx, 'questionMarks', qMarks);
      onLearnerChange(learnerIdx, 'mark', total.toString());
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-none">
      <CardHeader className="flex-shrink-0 border-b bg-muted/10">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-lg">2. Verification Pipeline</CardTitle>
                <CardDescription className="text-[10px] uppercase font-black text-primary tracking-widest">{scanType.replace('_', ' ')} mode</CardDescription>
            </div>
            {imagePreviews.length > 0 && (
                <Dialog>
                    <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8"><Eye className="mr-2 h-3 w-3" /> View Source</Button></DialogTrigger>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/[0.02] space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-[0.2em]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Deterministic Context
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">Target Class</Label>
                          <p className="text-sm font-black truncate">{targetClass?.className || 'None'}</p>
                      </div>
                      <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">Academic Term</Label>
                          <p className="text-sm font-black text-muted-foreground truncate">{activeTerm?.name || 'None'}</p>
                      </div>
                      {isMarkMode && (
                          <div className="col-span-2 space-y-1 border-t pt-2 mt-1">
                              <Label className="text-[9px] font-bold text-muted-foreground uppercase">Target Assessment Column</Label>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black py-1 px-2">
                                        {selectedAssessmentId === 'new' ? 'CREATE NEW FAT' : targetAssessment?.title || 'UNSELECTED'}
                                    </Badge>
                                    {targetAssessment && <span className="text-[10px] font-bold text-muted-foreground">Total Marks: {targetAssessment.max_mark}</span>}
                                  </div>
                                  {selectedAssessmentId === 'new' && scannedDetails.discoveredQuestions && scannedDetails.discoveredQuestions.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 animate-in slide-in-from-right-2">
                                          <Sparkles className="h-2.5 w-2.5" />
                                          <span>AI found {scannedDetails.discoveredQuestions.length} Questions</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
                <Table className="min-w-[500px]">
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-8 h-9 py-0"></TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black uppercase tracking-tighter">Verified Name</TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black uppercase tracking-tighter w-36">Link</TableHead>
                        <TableHead className="text-right text-[10px] h-9 py-0 w-24 font-black uppercase tracking-tighter">Mark / Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {scannedLearners.map((learner, index) => {
                        const mappedId = learnerMappings[index];
                        const isMapped = !!mappedId;
                        const hasQuestions = learner.questionMarks && learner.questionMarks.length > 0;
                        const isExpanded = expandedRows.has(index);

                        // Validate sum
                        let qSum = 0;
                        if (hasQuestions) {
                            learner.questionMarks!.forEach(qm => qSum += parseFloat(qm.score) || 0);
                        }
                        const isSumMismatch = hasQuestions && Math.abs(qSum - parseFloat(learner.mark)) > 0.1;

                        return (
                            <>
                                <TableRow key={index} className={cn("hover:bg-muted/20 h-11", !isMapped && "bg-amber-50/20")}>
                                    <TableCell className="p-0 text-center">
                                        <div className="flex items-center justify-center">
                                            {hasQuestions ? (
                                                <button onClick={() => toggleRow(index)} className="p-1 hover:bg-muted rounded">
                                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                </button>
                                            ) : (
                                                isMapped ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                                )
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1 px-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={learner.name}
                                                onChange={(e) => onLearnerChange(index, 'name', e.target.value)}
                                                className="h-7 text-xs border-transparent bg-transparent focus:bg-background font-medium"
                                            />
                                            {hasQuestions && <ListChecks className="h-3 w-3 text-primary opacity-40 shrink-0" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1 px-1">
                                        {targetClass ? (
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
                                                    <SelectItem value="unlinked" className="text-muted-foreground italic text-[10px]">Unmatched</SelectItem>
                                                    {targetClass.learners.map(l => (
                                                        <SelectItem 
                                                            key={l.id} 
                                                            value={l.id!}
                                                            disabled={isIdMapped(l.id!, index)}
                                                        >
                                                            {l.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-[9px] text-muted-foreground italic px-2">Missing class</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-right">
                                        {scanType === 'attendance_register' ? (
                                            <Select value={learner.attendanceStatus || 'present'} onValueChange={(v) => onLearnerChange(index, 'attendanceStatus', v)}>
                                                <SelectTrigger className="h-7 text-[10px] border-none bg-muted/20"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="present">Present</SelectItem>
                                                    <SelectItem value="absent">Absent</SelectItem>
                                                    <SelectItem value="late">Late</SelectItem>
                                                    <SelectItem value="excused">Excused</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isSumMismatch && (
                                                    <span title="Questions don't match total">
                                                        <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />
                                                    </span>
                                                )}
                                                <Input
                                                    value={learner.mark}
                                                    onChange={(e) => onLearnerChange(index, 'mark', e.target.value)}
                                                    className={cn(
                                                        "h-7 text-[11px] text-right border-transparent bg-transparent font-black w-14",
                                                        isSumMismatch ? "text-red-600" : "text-primary"
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {isExpanded && hasQuestions && (
                                    <TableRow className="bg-muted/10 animate-in slide-in-from-top-1">
                                        <TableCell colSpan={4} className="p-4 pl-12">
                                            <div className="space-y-4 border-b pb-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Question Breakdown</p>
                                                    {isSumMismatch && (
                                                        <Badge variant="destructive" className="h-5 text-[9px] gap-1 px-2">
                                                            <AlertCircle className="h-3 w-3" /> Sum Mismatch
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    {learner.questionMarks!.map((qm, qIdx) => {
                                                        const targetQ = targetAssessment?.questions?.find(q => q.question_number === qm.num) || 
                                                                        scannedDetails.discoveredQuestions?.find(dq => dq.num === qm.num);
                                                        return (
                                                            <div key={qIdx} className="space-y-1 bg-background p-2 rounded-lg border shadow-sm group/q">
                                                                <div className="flex justify-between items-center">
                                                                    <label className="text-[9px] font-black text-muted-foreground uppercase">{qm.num}</label>
                                                                    {targetQ && <span className="text-[8px] text-muted-foreground font-bold">max {targetQ.max_mark || targetQ.max}</span>}
                                                                </div>
                                                                <Input 
                                                                    value={qm.score} 
                                                                    onChange={(e) => updateQuestionMark(index, qIdx, e.target.value)}
                                                                    className={cn(
                                                                        "h-7 text-xs bg-muted/10 text-center font-black transition-colors focus:bg-background",
                                                                        targetQ && parseFloat(qm.score) > (targetQ.max_mark || parseFloat(targetQ.max)) ? "text-red-600 ring-1 ring-red-200" : ""
                                                                    )} 
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {isSumMismatch && (
                                                    <div className="flex items-center gap-2 p-2 rounded bg-amber-50 text-amber-800 border border-amber-100">
                                                        <Info className="h-3.5 w-3.5" />
                                                        <p className="text-[10px] font-medium leading-tight">
                                                            The calculated sum of questions is <strong>{qSum}</strong>, but the extracted total is <strong>{learner.mark}</strong>. 
                                                            Manual corrections will auto-calculate the total.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        );
                    })}
                    </TableBody>
                </Table>
              </div>
            </div>

            <div className="p-4 border-t bg-background mt-auto flex flex-col gap-3">
              <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100">
                  <Info className="h-3.5 w-3.5" />
                  <span>Verified data will be committed strictly to <strong>{targetClass?.className}</strong> in <strong>{activeTerm?.name}</strong>.</span>
              </div>
              
              <Button onClick={onSaveToExisting} disabled={!selectedClassId} className="w-full h-12 font-black shadow-lg">
                <Save className="mr-2 h-4 w-4" /> Commit Extraction
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12">
            <div className="p-6 rounded-full bg-muted/30 mb-4">
                <Database className="h-10 w-10 opacity-20" />
            </div>
            <h3 className="font-bold text-foreground opacity-60 uppercase tracking-widest text-xs">Ready for Pipeline</h3>
            <p className="text-[10px] mt-2 max-w-[220px] leading-relaxed">
                Select your class and assessment task on the left, upload your images, and click "Start AI Extraction" to begin the verification process.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};