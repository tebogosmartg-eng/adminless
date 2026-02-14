import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, PlusCircle, Eye, AlertCircle, Info, Calculator, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment, ScanType } from '@/lib/types';
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

  const questionHeaders = useMemo(() => {
    const qNums = new Set<string>();
    scannedLearners.forEach(l => l.questionMarks?.forEach(q => qNums.add(q.num)));
    return Array.from(qNums).sort((a, b) => parseInt(a) - parseInt(b));
  }, [scannedLearners]);

  const targetClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const isIdMapped = (id: string, currentIdx: number) => {
      return Object.entries(learnerMappings).some(([idx, mappedId]) => mappedId === id && parseInt(idx) !== currentIdx);
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
                    <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8"><Eye className="mr-2 h-3 w-3" /> Proof</Button></DialogTrigger>
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
                <div className="col-span-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Extracted Context</Label></div>
                <Input value={scannedDetails.testNumber} onChange={(e) => onDetailsChange('testNumber', e.target.value)} className="h-8 text-xs font-bold" placeholder="Title/Reference" />
                <Input value={scannedDetails.subject} onChange={(e) => onDetailsChange('subject', e.target.value)} className="h-8 text-xs" placeholder="Subject" />
              </div>

              <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Database Destination</Label>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target Class..." /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>)}</SelectContent>
                    </Select>
                    
                    {(scanType === 'class_marksheet' || scanType === 'individual_script') && (
                        <Select onValueChange={setSelectedAssessmentId} value={selectedAssessmentId} disabled={!selectedClassId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="FAT Column..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">+ New Assessment Task</SelectItem>
                                {availableAssessments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                  </div>
              </div>

              <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
                <Table className="min-w-[500px]">
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-8 h-9 py-0"></TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black uppercase tracking-tighter">Verified Name</TableHead>
                        <TableHead className="text-[10px] h-9 py-0 font-black uppercase tracking-tighter w-36">Class Link</TableHead>
                        {scanType === 'attendance_register' ? (
                            <TableHead className="text-right text-[10px] h-9 py-0 w-24 font-black uppercase tracking-tighter">Status</TableHead>
                        ) : (
                            <TableHead className="text-right text-[10px] h-9 py-0 w-20 font-black uppercase tracking-tighter">Extracted</TableHead>
                        )}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {scannedLearners.map((learner, index) => {
                        const mappedId = learnerMappings[index];
                        const isMapped = !!mappedId;

                        return (
                            <TableRow key={index} className={cn("hover:bg-muted/20 h-11", !isMapped && "bg-amber-50/20")}>
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
                                {targetClass ? (
                                    <Select 
                                        value={mappedId || "unlinked"} 
                                        onValueChange={(val) => updateLearnerMapping(index, val)}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-7 text-[10px] py-0 border-none bg-muted/20",
                                            !isMapped && "text-amber-700 font-bold"
                                        )}>
                                            <SelectValue placeholder="Manual Link..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unlinked" className="text-muted-foreground italic text-[10px]">Unmatched</SelectItem>
                                            <div className="px-2 py-1 text-[9px] font-black uppercase text-muted-foreground opacity-50 bg-muted/30">Class Roster</div>
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
                                    <span className="text-[9px] text-muted-foreground italic px-2">Select class first</span>
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
                                    <Input
                                        value={learner.mark}
                                        onChange={(e) => onLearnerChange(index, 'mark', e.target.value)}
                                        className="h-7 text-[11px] text-right border-transparent bg-transparent font-bold text-primary"
                                    />
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
              <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100">
                  <Info className="h-3.5 w-3.5" />
                  <span>Verify all links before saving. Unlinked rows will not be committed to the database.</span>
              </div>
              
              <Button onClick={onSaveToExisting} disabled={!selectedClassId} className="w-full h-12 font-black shadow-lg">
                <Save className="mr-2 h-4 w-4" /> Finalize & Commit Scan
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12">
            <Calculator className="h-12 w-12 opacity-10 mb-4" />
            <h3 className="font-bold text-foreground opacity-60 uppercase tracking-widest text-xs">Awaiting Extraction</h3>
            <p className="text-[10px] mt-1 max-w-[200px]">Once AI analysis is complete, you can verify and link learners here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};