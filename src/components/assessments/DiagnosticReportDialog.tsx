"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    AlertTriangle, 
    Download, 
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    ClipboardList
} from 'lucide-react';
import { ClassInfo, Term, AcademicYear } from '@/lib/types';
import { useDiagnosticReportData } from '@/hooks/useDiagnosticReportData';
import { useSettings } from '@/context/SettingsContext';
import { generateDiagnosticReportPDF } from '@/utils/pdf/diagnosticReport';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface DiagnosticReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classInfo: ClassInfo;
  term: Term;
  year: AcademicYear;
}

export const DiagnosticReportDialog = ({ open, onOpenChange, classInfo, term, year }: DiagnosticReportDialogProps) => {
  const { atRiskThreshold, schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { data, loading } = useDiagnosticReportData(classInfo, term.id, atRiskThreshold);
  
  const [diagnosticSummary, setDiagnosticSummary] = useState("");
  const [interventionPlan, setInterventionPlan] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (data) {
      setDiagnosticSummary(data.autoSummary);
      setInterventionPlan(`Based on the diagnostic findings, the following intervention strategies will be implemented:\n\n1. Small-group support for the ${data.summary.belowThresholdCount} identified learners.\n2. Targeted revision on tasks where average performance was below 50%.\n3. Parental consultation for high-risk individuals.`);
    }
  }, [data]);

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
        generateDiagnosticReportPDF(
            data,
            { className: classInfo.className, subject: classInfo.subject, grade: classInfo.grade },
            { year: year.name, term: term.name, isLocked: term.closed },
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone },
            diagnosticSummary,
            interventionPlan
        );
        showSuccess("Diagnostic report exported to PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/20 shrink-0">
          <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">Moderation Ready</Badge>
                    <DialogTitle className="text-2xl font-bold">Diagnostic Analysis Report</DialogTitle>
                    <DialogDescription>
                        {classInfo.className} • {classInfo.subject} • {term.name}
                    </DialogDescription>
                </div>
                <Button onClick={handleExport} disabled={isExporting || !data} className="font-bold gap-2">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Official PDF
                </Button>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Running Diagnostic Algorithms...</p>
            </div>
          ) : data ? (
            <div className="space-y-8 pb-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/10">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Class Average</p>
                        <div className="text-2xl font-black text-primary">{data.summary.classAverage.toFixed(1)}%</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-green-50/50 border-green-100">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Pass Rate</p>
                        <div className="text-2xl font-black text-green-700">{data.summary.passRate.toFixed(0)}%</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-muted/30">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Highest Mark</p>
                        <div className="text-2xl font-black">{data.summary.highestMark.toFixed(0)}%</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-100">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Below Threshold</p>
                        <div className="text-2xl font-black text-amber-700">{data.summary.belowThresholdCount}</div>
                    </div>
                </div>

                {data.comparison.change !== null && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                        {data.comparison.change > 0 ? <ArrowUpRight className="text-green-600 h-5 w-5" /> : data.comparison.change < 0 ? <ArrowDownRight className="text-red-600 h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        <span className="text-sm font-medium">
                            Performance has {data.comparison.change > 0 ? 'improved' : data.comparison.change < 0 ? 'declined' : 'remained stable'} by 
                            <span className="font-bold mx-1">{Math.abs(data.comparison.change).toFixed(1)}%</span> 
                            since previous term.
                        </span>
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Performance Distribution</h4>
                    <div className="flex h-10 w-full rounded-lg overflow-hidden border shadow-inner bg-muted/20">
                        {Object.entries(data.distribution).map(([band, count]) => {
                            const pct = (count / data.summary.totalLearners) * 100;
                            if (count === 0) return null;
                            return (
                                <div 
                                    key={band} 
                                    style={{ width: `${pct}%` }} 
                                    className={cn(
                                        "h-full flex items-center justify-center text-[10px] font-black text-white transition-all",
                                        band === "0-29" ? "bg-red-700" : band === "30-39" ? "bg-red-500" : band === "40-49" ? "bg-orange-500" : band === "80-100" ? "bg-green-600" : "bg-blue-600"
                                    )}
                                    title={`${band}%: ${count} learners`}
                                >
                                    {count}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" /> Diagnostic Analysis & Interpretation
                        </Label>
                        <Textarea 
                            value={diagnosticSummary}
                            onChange={(e) => setDiagnosticSummary(e.target.value)}
                            rows={4}
                            className="bg-muted/10 text-sm leading-relaxed"
                            placeholder="Interpret the statistics above..."
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardList className="h-3.5 w-3.5" /> Intervention Plan & Strategy
                        </Label>
                        <Textarea 
                            value={interventionPlan}
                            onChange={(e) => setInterventionPlan(e.target.value)}
                            rows={6}
                            className="bg-muted/10 text-sm leading-relaxed"
                            placeholder="Describe how you will support learners below threshold..."
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Identified at-risk learners
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {data.atRisk.map((l, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded border bg-red-50/20 text-xs">
                                <span className="font-medium">{l.name}</span>
                                <Badge variant="outline" className="h-5 text-red-600 border-red-200">{l.mark.toFixed(1)}%</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground italic">
                Could not calculate diagnostic data.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};