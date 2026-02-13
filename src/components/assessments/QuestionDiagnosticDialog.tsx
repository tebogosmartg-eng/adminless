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
    ShieldCheck
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

  // Initialize fields from saved data or drafts, but only once per assessment load
  useEffect(() => {
    if (stats && !initializedRef.current) {
        setFindings(stats.savedDiagnostic?.findings || stats.drafts.findings);
        setInterventions(stats.savedDiagnostic?.interventions || stats.drafts.interventions);
        initializedRef.current = true;
    }
  }, [stats]);

  // Reset initialization ref when dialog closes or assessment changes
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
          showSuccess("Reset to latest AI diagnostic draft.");
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
        showSuccess("Assessment diagnostic exported.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/20">
          <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">
                            Diagnostic Engine
                        </Badge>
                        {stats?.savedDiagnostic && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-none text-[9px] font-black uppercase">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Approved
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className="text-2xl font-bold">{assessment.title}</DialogTitle>
                    <DialogDescription>Question-Level Analysis & Intervention Planning</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving || loading} className="gap-2 font-bold h-9">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Approve & Save
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
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Processing performance data...</p>
            </div>
          ) : stats ? (
            <div className="space-y-8 pb-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.qStats.map(s => (
                        <div key={s.id} className={cn(
                            "p-3 rounded-xl border transition-all",
                            s.isWeak ? "bg-red-50 border-red-100" : "bg-muted/30 border-muted-foreground/10"
                        )}>
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Q{s.number}</span>
                                {s.isWeak ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            </div>
                            <div className="text-xl font-black">{s.avg}%</div>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold truncate" title={s.skill}>{s.skill || "General"}</p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4" /> 1. Diagnostic Findings & Skill Analysis
                            </Label>
                            <Button variant="ghost" size="sm" onClick={handleRefreshDraft} className="h-7 text-[10px] font-bold uppercase text-muted-foreground">
                                <RefreshCw className="h-3 w-3 mr-1" /> Reset to AI Draft
                            </Button>
                        </div>
                        <Textarea 
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            rows={4}
                            className="bg-muted/10 text-sm leading-relaxed"
                            placeholder="Interpret the question-level data here..."
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> 2. Proposed Remedial Strategy
                        </Label>
                        <Textarea 
                            value={interventions}
                            onChange={(e) => setInterventions(e.target.value)}
                            rows={5}
                            className="bg-muted/10 text-sm leading-relaxed"
                            placeholder="Detail your plan for supporting the identified weak areas..."
                        />
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <FileSearch className="h-4 w-4" /> Class question-marks verification
                    </h4>
                    <div className="border rounded-lg overflow-hidden h-[200px]">
                        <ScrollArea className="h-full">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 border-b">Learner</th>
                                        {assessment.questions?.map(q => <th key={q.id} className="p-2 border-b text-center">{q.question_number}</th>)}
                                        <th className="p-2 border-b text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {learners.map(l => {
                                        const lMark = stats.rawMarks.find(m => m.learner_id === l.id);
                                        return (
                                            <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="p-2 font-medium">{l.name}</td>
                                                {assessment.questions?.map(q => {
                                                    const qScore = lMark?.question_marks?.find(qm => qm.question_id === q.id)?.score;
                                                    return <td key={q.id} className="p-2 text-center text-muted-foreground">{qScore !== undefined ? qScore : "-"}</td>;
                                                })}
                                                <td className="p-2 text-right font-bold">{lMark?.score || "-"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </ScrollArea>
                    </div>
                </div>
            </div>
          ) : (
            <div className="p-20 text-center text-muted-foreground italic flex flex-col items-center gap-3">
                <ShieldCheck className="h-12 w-12 opacity-10" />
                <p>Insufficient data to run diagnostic. Please capture question-level marks first.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};