"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Download, 
    Loader2, 
    AlertTriangle, 
    BrainCircuit,
    ClipboardList,
    FileSearch,
    Save,
    CheckCircle2,
    RefreshCw,
    ShieldCheck,
    Target
} from 'lucide-react';
import { Assessment, Learner } from '@/lib/types';
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
  
  const [findings, setFindings] = useState("");
  const [interventions, setInterventions] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const initializedRef = useRef(false);

  useEffect(() => {
    if (stats && !initializedRef.current) {
        setFindings(stats.savedDiagnostic?.findings || stats.drafts.findings);
        setInterventions(stats.savedDiagnostic?.interventions || stats.drafts.interventions);
        initializedRef.current = true;
    }
  }, [stats]);

  useEffect(() => {
      if (!open) {
          initializedRef.current = false;
      }
  }, [open, assessment.id]);

  const handleSave = async () => {
    setIsSaving(true);
    await saveDiagnostic(findings, interventions);
    setIsSaving(false);
  };

  const handleRefreshDraft = () => {
      if (stats) {
          setFindings(stats.drafts.findings);
          setInterventions(stats.drafts.interventions);
          showSuccess("Draft reset to latest data analysis.");
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
            findings,
            interventions,
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone }
        );
        showSuccess("Detailed diagnostic report exported.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/20 shrink-0">
          <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">
                            Diagnostic Analysis
                        </Badge>
                        {stats?.savedDiagnostic && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-none text-[9px] font-black uppercase">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Analysis Approved
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className="text-2xl font-bold">{assessment.title}</DialogTitle>
                    <DialogDescription>Question-level performance metrics and intervention roadmap.</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving || loading} className="gap-2 font-bold h-9">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Analysis
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
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Recalculating diagnostic stats...</p>
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
                            {/* Simple visual background fill */}
                            <div 
                                className={cn("absolute bottom-0 left-0 h-1 transition-all", s.isWeak ? "bg-red-500" : "bg-green-500")} 
                                style={{ width: `${s.passRate}%` }} 
                            />
                        </div>
                    ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4" /> 1. Findings & Interpretation
                            </Label>
                            <Button variant="ghost" size="sm" onClick={handleRefreshDraft} className="h-7 text-[10px] font-bold uppercase text-muted-foreground">
                                <RefreshCw className="h-3 w-3 mr-1" /> Reset to Draft
                            </Button>
                        </div>
                        <Textarea 
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            rows={8}
                            className="bg-muted/10 text-sm leading-relaxed border-none shadow-inner"
                            placeholder="Interpret the performance data..."
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> 2. Remedial Action Plan
                        </Label>
                        <Textarea 
                            value={interventions}
                            onChange={(e) => setInterventions(e.target.value)}
                            rows={8}
                            className="bg-muted/10 text-sm leading-relaxed border-none shadow-inner"
                            placeholder="Detail your strategy for weak areas..."
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileSearch className="h-4 w-4" /> Item Analysis Data Table
                        </h4>
                        <Badge variant="outline" className="text-[10px] uppercase">{stats.overallAvg}% Overall Average</Badge>
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
          ) : (
            <div className="p-20 text-center text-muted-foreground italic flex flex-col items-center gap-3">
                <Target className="h-12 w-12 opacity-10" />
                <p>Insufficient question-level data. Capture marks per question to enable diagnostic logic.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};