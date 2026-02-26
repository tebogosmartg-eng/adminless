"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Eye, AlertCircle, CheckCircle2, ShieldCheck, ListChecks, ChevronDown, ChevronRight, Sparkles, Loader2, Cloud, FileWarning } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment, ScanType } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  setSelectedAssessmentId: (id: string) => void;
  scanType?: ScanType;
  handleSaveDraft?: () => Promise<void>;
  isSavingDraft?: boolean;
}

export const ScanReviewSection = ({
  scannedDetails, scannedLearners, learnerMappings, updateLearnerMapping,
  classes, selectedClassId, onLearnerChange, onSaveToExisting, 
  imagePreviews = [], availableAssessments = [], selectedAssessmentId,
  handleSaveDraft, isSavingDraft
}: ScanReviewSectionProps) => {

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const targetClass = classes.find(c => c.id === selectedClassId);
  const targetAss = availableAssessments.find(a => a.id === selectedAssessmentId);

  const toggleRow = (idx: number) => {
    const next = new Set(expandedRows);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedRows(next);
  };

  const updateQM = (lIdx: number, qIdx: number, val: string) => {
    const l = scannedLearners[lIdx];
    const qms = [...(l.questionMarks || [])];
    qms[qIdx] = { ...qms[qIdx], score: val };
    const total = qms.reduce((s, q) => s + (parseFloat(q.score) || 0), 0);
    onLearnerChange(lIdx, 'questionMarks', qms);
    onLearnerChange(lIdx, 'mark', total.toFixed(1).replace(/\.0$/, ''));
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-none">
      <CardHeader className="flex-shrink-0 border-b bg-muted/10">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-lg">2. Verification Pipeline</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase text-primary">Question-Level Mode</CardDescription>
            </div>
            <div className="flex gap-2">
                {handleSaveDraft && <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSavingDraft}>{isSavingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}</Button>}
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        {scannedLearners.length > 0 ? (
          <div className="p-4 space-y-4">
            <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="text-[10px] uppercase font-black">Learner</TableHead>
                            <TableHead className="text-[10px] uppercase font-black w-32 text-right">Total Mark</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {scannedLearners.map((l, i) => {
                            const isExpanded = expandedRows.has(i);
                            const warnings = (l as any).warnings || [];
                            const hasWarn = warnings.length > 0;
                            return (
                                <TooltipProvider key={i}>
                                    <TableRow className={cn(hasWarn && "bg-red-50/20")}>
                                        <TableCell className="p-0 text-center">
                                            <button onClick={() => toggleRow(i)} className="p-1 hover:bg-muted rounded">
                                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{l.name}</span>
                                                <Select value={learnerMappings[i] || ""} onValueChange={(v) => updateLearnerMapping(i, v)}>
                                                    <SelectTrigger className="h-6 text-[10px] border-none p-0 bg-transparent text-primary underline"><SelectValue placeholder="Map to list..." /></SelectTrigger>
                                                    <SelectContent>{targetClass?.learners.map(cl => <SelectItem key={cl.id} value={cl.id!}>{cl.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {hasWarn && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <FileWarning className="h-3.5 w-3.5 text-red-500 cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs">{warnings.join(', ')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <span className="text-sm font-black text-primary">{l.mark}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && l.questionMarks && (
                                        <TableRow className="bg-muted/5">
                                            <TableCell colSpan={3} className="p-4 pl-12">
                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                    {l.questionMarks.map((qm, qIdx) => (
                                                        <div key={qIdx} className="space-y-1">
                                                            <label className="text-[9px] font-black uppercase text-muted-foreground">{qm.num}</label>
                                                            <Input 
                                                                value={qm.score} 
                                                                onChange={e => updateQM(i, qIdx, e.target.value)}
                                                                className="h-7 text-xs text-center font-bold" 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TooltipProvider>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <Button onClick={onSaveToExisting} className="w-full h-12 font-black shadow-lg bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize & Commit Marks
            </Button>
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-12">
                <Sparkles className="h-10 w-10 opacity-10" />
                <p className="text-xs uppercase font-black tracking-widest">Awaiting Extraction</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};