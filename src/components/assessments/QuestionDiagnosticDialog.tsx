"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    BarChart3, 
    Download, 
    Loader2, 
    AlertTriangle, 
    CheckCircle2, 
    BrainCircuit,
    ClipboardList,
    FileSearch,
    ShieldAlert
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
  const { stats, loading } = useQuestionAnalysis(assessment, learners);
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  
  const [findings, setFindings] = useState("");
  const [interventions, setInterventions] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (stats) {
        setFindings(stats.drafts.findings);
        setInterventions(stats.drafts.interventions);
    }
  }, [stats]);

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
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">
                        Diagnostic Engine
                    </Badge>
                    <DialogTitle className="text-2xl font-bold">{assessment.title}</DialogTitle>
                    <DialogDescription>Question-Level Analysis & Intervention Planning</DialogDescription>
                </div>
                <Button onClick={handleExport} disabled={isExporting || !stats} className="font-bold gap-2">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Departmental PDF
                </Button>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Processing per-question performance data...</p>
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

                {stats.weakSkills.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-4">
                        <div className="bg-amber-100 p-2 rounded-full"><ShieldAlert className="h-5 w-5 text-amber-600" /></div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Weak Skills Identified</h4>
                            <p className="text-xs text-amber-700 mt-1">Intervention is recommended for: <strong>{stats.weakSkills.join(', ')}</strong></p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6">
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4" /> 1. Diagnostic Findings & Skill Analysis
                        </Label>
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
                        <FileSearch className="h-4 w-4" /> Review class question-marks
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
            <div className="p-20 text-center text-muted-foreground italic">
                Insufficient data to run diagnostic. Please capture question-level marks first.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};