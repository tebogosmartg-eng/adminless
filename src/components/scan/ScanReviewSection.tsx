"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Eye, AlertCircle, CheckCircle2, ShieldCheck, ListChecks, ChevronDown, ChevronRight, Sparkles, Loader2, Cloud, FileWarning, Info } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment, ScanType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
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
  classes, selectedClassId, setSelectedClassId, onLearnerChange, onSaveToExisting, 
  availableAssessments = [], selectedAssessmentId, setSelectedAssessmentId,
  handleSaveDraft, isSavingDraft
}: ScanReviewSectionProps) => {

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const targetClass = classes.find(c => c.id === selectedClassId);

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

  const getConfidenceColor = (score: number) => {
      if (score >= 0.8) return "text-green-600";
      if (score >= 0.5) return "text-amber-600";
      return "text-red-600";
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
                {handleSaveDraft && (
                    <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSavingDraft}>
                        {isSavingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3 mr-2" />}
                        {isSavingDraft ? "Saving..." : "Save Draft"}
                    </Button>
                )}
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        <TooltipProvider>
            {scannedLearners.length > 0 ? (
            <div className="p-4 space-y-4">
                <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Learner Identity</TableHead>
                                <TableHead className="text-[10px] uppercase font-black w-32 text-right">Total extracted</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scannedLearners.map((l, i) => {
                                const isExpanded = expandedRows.has(i);
                                const warnings = (l as any).warnings || [];
                                const hasWarn = warnings.length > 0;
                                
                                return (
                                    <React.Fragment key={i}>
                                        <TableRow className={cn("transition-colors", hasWarn ? "bg-red-50/20" : isExpanded ? "bg-muted/10" : "")}>
                                            <TableCell className="p-0 text-center">
                                                <button onClick={() => toggleRow(i)} className="p-1 hover:bg-muted rounded">
                                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{l.name}</span>
                                                    <Select value={learnerMappings[i] || ""} onValueChange={(v) => updateLearnerMapping(i, v)}>
                                                        <SelectTrigger className="h-6 text-[10px] border-none p-0 bg-transparent text-primary underline focus:ring-0">
                                                            <SelectValue placeholder="Map to class list..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {targetClass?.learners.map(cl => <SelectItem key={cl.id} value={cl.id!}>{cl.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasWarn && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <FileWarning className="h-4 w-4 text-red-500 animate-pulse cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <ul className="list-disc pl-3 text-xs">
                                                                    {warnings.map((w: string, idx: number) => <li key={idx}>{w}</li>)}
                                                                </ul>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    <span className="text-lg font-black text-primary">{l.mark}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {isExpanded && l.questionMarks && (
                                            <TableRow className="bg-muted/5 border-b">
                                                <TableCell colSpan={3} className="p-4 pl-12">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                        {l.questionMarks.map((qm: any, qIdx: number) => {
                                                            const isLowConf = qm.confidence < 0.6;
                                                            return (
                                                                <div key={qIdx} className="space-y-1.5 p-2 rounded-lg bg-background border shadow-sm group/qm">
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-[9px] font-black uppercase text-muted-foreground">Q{qm.num}</label>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className={cn("text-[8px] font-bold cursor-help", getConfidenceColor(qm.confidence))}>
                                                                                    {Math.round(qm.confidence * 100)}% Conf.
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="max-w-[200px] text-[10px]">
                                                                                <p className="font-bold mb-1 uppercase tracking-tighter">AI Evidence Found:</p>
                                                                                <p className="italic">"{qm.evidenceText || 'No clear text detected.'}"</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                    <Input 
                                                                        value={qm.score} 
                                                                        onChange={e => updateQM(i, qIdx, e.target.value)}
                                                                        className={cn(
                                                                            "h-8 text-center font-bold text-lg",
                                                                            isLowConf && "border-amber-200 bg-amber-50/30",
                                                                            qm.score === "" && "border-red-200 bg-red-50/30"
                                                                        )} 
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
                    <p className="text-[11px] text-blue-800 leading-tight font-medium">
                        <strong>Integrity Notice:</strong> Reviewing individual question scores ensures your Diagnostic Reports are accurate. High-confidence items (80%+) are likely correct, but please verify any highlighted low-confidence scores.
                    </p>
                </div>

                <Button onClick={onSaveToExisting} className="w-full h-14 font-black text-lg shadow-xl shadow-green-500/10 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Finalize & Commit to Record
                </Button>
            </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-12 text-center">
                    <div className="bg-muted p-6 rounded-full">
                        <Sparkles className="h-10 w-10 opacity-20" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold uppercase tracking-widest">Awaiting Verification</p>
                        <p className="text-xs max-w-xs">Once you start AI Extraction, the granular results will appear here for your review.</p>
                    </div>
                </div>
            )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};