"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Download, 
    Loader2, 
    AlertTriangle, 
    Save,
    CheckCircle2,
    RefreshCw,
    Plus,
    Trash2,
    ListChecks,
    Table as TableIcon
} from 'lucide-react';
import { Assessment, Learner, DiagnosticRow } from '@/lib/types';
import { useQuestionAnalysis } from '@/hooks/useQuestionAnalysis';
import { useSettings } from '@/context/SettingsContext';
import { generateQuestionDiagnosticPDF } from '@/utils/pdf/questionDiagnosticReport';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface QuestionDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment;
  learners: Learner[];
}

export const QuestionDiagnosticDialog = ({ open, onOpenChange, assessment, learners }: QuestionDiagnosticDialogProps) => {
  const { stats, loading, saveDiagnostic } = useQuestionAnalysis(assessment, learners);
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  
  const [rows, setRows] = useState<DiagnosticRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const initializedRef = useRef(false);

  useEffect(() => {
    if (stats && !initializedRef.current) {
        let loadedRows: DiagnosticRow[] = [];
        
        if (stats.savedDiagnostic?.findings) {
            try {
                const parsed = JSON.parse(stats.savedDiagnostic.findings);
                if (Array.isArray(parsed)) {
                    loadedRows = parsed;
                } else {
                    // Fallback if findings was a simple string
                    loadedRows = stats.diagnosticRows;
                }
            } catch (e) {
                // Backward compatibility: Convert string findings to first row
                loadedRows = [{
                    id: 'legacy',
                    finding: stats.savedDiagnostic.findings as any as string,
                    intervention: stats.savedDiagnostic.interventions as any as string
                }, ...stats.diagnosticRows.filter(r => r.id !== 'summary')];
            }
        } else {
            loadedRows = stats.diagnosticRows;
        }

        setRows(loadedRows);
        initializedRef.current = true;
    }
  }, [stats]);

  useEffect(() => {
      if (!open) {
          initializedRef.current = false;
      }
  }, [open, assessment.id]);

  const handleUpdateRow = (id: string, field: 'finding' | 'intervention', value: string) => {
      setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => {
      setRows(prev => [...prev, {
          id: crypto.randomUUID(),
          finding: "",
          intervention: ""
      }]);
  };

  const handleDeleteRow = (id: string) => {
      setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveDiagnostic(rows);
    setIsSaving(false);
  };

  const handleRefreshDraft = () => {
      if (stats) {
          setRows(stats.diagnosticRows);
          showSuccess("Reset to AI analysis table.");
      }
  };

  const handleExport = () => {
    if (!stats) return;
    setIsExporting(true);
    try {
        generateQuestionDiagnosticPDF(
            assessment,
            learners,
            stats.qStats,
            stats.rawMarks,
            rows,
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone }
        );
        showSuccess("Tabular diagnostic report exported.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/20 shrink-0">
          <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">
                            Tabular Diagnostic
                        </Badge>
                        {stats?.savedDiagnostic && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-none text-[9px] font-black uppercase">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Approved
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className="text-2xl font-bold">{assessment.title}</DialogTitle>
                    <DialogDescription>Structure findings and interventions in a departmental-ready table.</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving || loading} className="gap-2 font-bold h-9">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting || !stats} className="font-bold gap-2 h-9">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export PDF
                    </Button>
                </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Processing analysis...</p>
            </div>
          ) : stats ? (
            <div className="space-y-10 pb-10">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {stats.qStats.map(s => (
                        <div key={s.id} className={cn(
                            "flex flex-col p-4 rounded-xl border transition-all relative overflow-hidden",
                            s.isWeak ? "bg-red-50 border-red-100" : "bg-muted/30 border-muted-foreground/10"
                        )}>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Q{s.number}</span>
                                {s.isWeak ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            </div>
                            <div className="text-2xl font-black relative z-10">{s.avg}%</div>
                            <div className="flex justify-between items-center mt-1 relative z-10">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold truncate max-w-[80px]" title={s.skill}>{s.skill || "Skill"}</p>
                                <span className="text-[8px] font-black text-muted-foreground/60">{s.passRate}% Pass</span>
                            </div>
                            <div 
                                className={cn("absolute bottom-0 left-0 h-1 transition-all", s.isWeak ? "bg-red-500" : "bg-green-500")} 
                                style={{ width: `${s.passRate}%` }} 
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TableIcon className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Analysis & Intervention Grid</h4>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleRefreshDraft} className="h-7 text-[10px] font-bold uppercase text-muted-foreground">
                                <RefreshCw className="h-3 w-3 mr-1" /> Reset AI Draft
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleAddRow} className="h-7 text-[10px] font-bold uppercase">
                                <Plus className="h-3 w-3 mr-1" /> Add Row
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[45%] font-black text-[10px] uppercase tracking-widest py-3">Diagnostic Findings / Interpretation</TableHead>
                                    <TableHead className="w-[45%] font-black text-[10px] uppercase tracking-widest py-3">Proposed Intervention Strategy</TableHead>
                                    <TableHead className="w-[10%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} className="group hover:bg-muted/10 transition-colors">
                                        <TableCell className="p-2 align-top">
                                            <Textarea 
                                                value={row.finding}
                                                onChange={(e) => handleUpdateRow(row.id, 'finding', e.target.value)}
                                                className="border-none shadow-none resize-none bg-transparent min-h-[80px] focus-visible:ring-1 text-sm leading-relaxed"
                                                placeholder="What did the data reveal?"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 align-top border-l">
                                            <Textarea 
                                                value={row.intervention}
                                                onChange={(e) => handleUpdateRow(row.id, 'intervention', e.target.value)}
                                                className="border-none shadow-none resize-none bg-transparent min-h-[80px] focus-visible:ring-1 text-sm leading-relaxed"
                                                placeholder="What is the plan of action?"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right p-2 align-top">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteRow(row.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ListChecks className="h-4 w-4" /> Item Analysis Records
                        </h4>
                    </div>
                    <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-muted/50 border-b">
                                <tr className="h-10">
                                    <th className="px-4 font-bold uppercase text-[10px] text-muted-foreground">Learner</th>
                                    {assessment.questions?.map(q => <th key={q.id} className="text-center font-bold uppercase text-[10px] text-muted-foreground border-l">Q{q.question_number}</th>)}
                                    <th className="px-4 text-right font-bold uppercase text-[10px] text-primary border-l bg-primary/5">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {learners.map(l => {
                                    const lMark = stats.rawMarks.find(m => m.learner_id === l.id);
                                    return (
                                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors h-10">
                                            <td className="px-4 font-medium">{l.name}</td>
                                            {assessment.questions?.map(q => {
                                                const qScore = lMark?.question_marks?.find(qm => qm.question_id === q.id)?.score;
                                                const isLow = qScore !== undefined && qScore !== null && (qScore / q.max_mark) < 0.5;
                                                return (
                                                    <td key={q.id} className={cn("text-center border-l", isLow && "text-red-600 font-bold bg-red-50/30")}>
                                                        {qScore !== undefined ? qScore : "-"}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 text-right font-black text-primary bg-primary/[0.02] border-l">
                                                {lMark?.score || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};