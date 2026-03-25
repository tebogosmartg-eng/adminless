"use client";

import { useRemediation } from "@/hooks/useRemediation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Rocket, 
    CheckCircle2, 
    Clock, 
    Trash2, 
    AlertCircle, 
    ShieldCheck,
    ChevronRight,
    ArrowRight,
    FileText,
    BrainCircuit,
    Loader2,
    Check,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { useAcademic } from "@/context/AcademicContext";
import { db } from "@/db";
import { generateRemediationWorksheet } from "@/services/gemini";
import { RemediationWorksheetDialog } from "./RemediationWorksheetDialog";
import { showError } from "@/utils/toast";

interface RemediationActionPlanProps {
  classId: string;
  termId: string;
}

export const RemediationActionPlan = ({ classId, termId }: RemediationActionPlanProps) => {
  const { tasks, updateTaskStatus, deleteTask } = useRemediation(classId, termId);
  const { assessments } = useAcademic();

  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState(false);
  const [worksheetContent, setWorksheetContent] = useState("");
  const [isWorksheetOpen, setIsWorksheetOpen] = useState(false);
  const [activeWorksheetTitle, setActiveWorksheetTitle] = useState("");

  const completed = tasks.filter(t => t.status === 'completed');
  const pending = tasks.filter(t => t.status !== 'completed');

  const handleGenerateWorksheet = async (assessmentId: string) => {
      const assessment = assessments.find(a => a.id === assessmentId);
      if (!assessment) return;

      setIsGeneratingWorksheet(true);
      setActiveWorksheetTitle(assessment.title);
      
      try {
          const diag = await db.diagnostics.where('assessment_id').equals(assessmentId).first();
          if (!diag || !diag.findings) {
              showError("A diagnostic analysis must be finalized before generating a worksheet.");
              setIsGeneratingWorksheet(false);
              return;
          }

          const findings = JSON.parse(diag.findings);
          const cls = await db.classes.get(classId);
          
          const content = await generateRemediationWorksheet(
              cls?.subject || "General",
              cls?.grade || "N/A",
              assessment.title,
              findings
          );

          setWorksheetContent(content);
          setIsWorksheetOpen(true);
      } catch (e) {
          showError("Worksheet generation failed.");
      } finally {
          setIsGeneratingWorksheet(false);
      }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5 mt-6 print:border-none print:bg-transparent print:py-2 print:text-left print:p-0">
        <Rocket className="h-10 w-10 mb-2 opacity-20 no-print" />
        <h3 className="font-bold text-foreground print:hidden">No Active Remediation Plan</h3>
        <p className="text-xs max-w-xs mt-1 no-print">
          Open an Assessment Diagnostic and click "Activate Action Plan" to populate your pedagogical intervention list.
        </p>
        <p className="hidden print:block text-sm text-slate-800 font-medium italic">No active remediation plans recorded for this period.</p>
      </div>
    );
  }

  // Get unique source assessments for worksheet generation
  const sourceAssessmentIds = [...new Set(tasks.map(t => t.assessment_id))];

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2 print:text-black">
                <ShieldCheck className="h-5 w-5 text-green-600 no-print" />
                Remediation Action Plan
            </h3>
            <p className="text-xs text-muted-foreground no-print">Proof of pedagogical intervention for departmental audit.</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-8 px-3 font-black uppercase text-[10px] tracking-widest print:bg-transparent print:border-slate-400 print:text-black">
                {completed.length} / {tasks.length} Resolved
            </Badge>
        </div>
      </div>

      {/* AI Worksheet Accelerator Row */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 no-print">
          {(sourceAssessmentIds as string[]).map((id: string) => {
              const ass = assessments.find(a => a.id === id);
              if (!ass) return null;
              return (
                  <Card key={id} className="bg-blue-600 text-white border-none shadow-lg overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <BrainCircuit className="h-16 w-16" />
                      </div>
                      <CardContent className="p-4 relative z-10">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Pedagogical Bridge</p>
                          <h4 className="font-bold text-sm mb-3 truncate pr-8">{ass.title}</h4>
                          <Button 
                            onClick={() => handleGenerateWorksheet(id)} 
                            disabled={isGeneratingWorksheet}
                            size="sm" 
                            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black text-[10px] uppercase tracking-tighter h-8"
                          >
                              {isGeneratingWorksheet && activeWorksheetTitle === ass.title ? (
                                  <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Processing...</>
                              ) : (
                                  <><Sparkles className="h-3 w-3 mr-2" /> Generate Worksheet</>
                              )}
                          </Button>
                      </CardContent>
                  </Card>
              );
          })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 print-avoid-break">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 print:text-black">
                <Clock className="h-3 w-3 no-print" /> Active Interventions
            </h4>
            <ScrollArea className="h-[400px] pr-4 print:h-auto print:max-h-none print:overflow-visible print:pr-0">
                <div className="space-y-3">
                    {pending.map((task) => (
                        <Card key={task.id} className="shadow-none border group hover:border-primary/40 transition-all overflow-hidden print-avoid-break print:border-slate-300">
                            <CardContent className="p-4 flex gap-4 print:p-3">
                                <div className="pt-1 no-print">
                                    <Checkbox 
                                        checked={false} 
                                        onCheckedChange={() => updateTaskStatus(task.id, 'completed')}
                                        className="h-5 w-5"
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase text-primary tracking-tighter bg-primary/5 px-1.5 rounded truncate max-w-[150px] print:bg-transparent print:border print:border-slate-200 print:text-slate-600">
                                            Source: {task.title}
                                        </span>
                                        <span className="text-[8px] font-bold text-muted-foreground">{format(new Date(task.created_at), 'dd MMM')}</span>
                                    </div>
                                    <p className="text-sm font-bold leading-tight text-foreground/90 print:text-black">{task.description}</p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] uppercase font-black" onClick={() => updateTaskStatus(task.id, 'completed')}>
                                            Mark as Applied
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(task.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {pending.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground italic text-xs print:py-2 print:text-left print:text-black font-medium">
                            No pending interventions recorded.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="space-y-4 print-avoid-break">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2 print:text-black">
                <CheckCircle2 className="h-3 w-3 no-print" /> Remediation Proof (Audit Ready)
            </h4>
            <div className="border rounded-xl bg-muted/20 overflow-hidden print:border-slate-300 print:bg-transparent">
                <ScrollArea className="h-[400px] print:h-auto print:max-h-none print:overflow-visible">
                    <div className="divide-y divide-border/50 print:divide-slate-200">
                        {completed.map((task) => (
                            <div key={task.id} className="p-4 bg-background/40 flex items-start gap-4 group print-avoid-break print:p-3">
                                <div className="pt-1">
                                    <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center print:border print:border-slate-300 print:bg-transparent print:text-slate-400">
                                        <Check className="h-3 w-3" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground/70 line-through decoration-muted-foreground/30 print:text-slate-600">
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-green-200 text-green-700 bg-green-50/50 print:bg-transparent print:border-slate-300 print:text-slate-500">Applied</Badge>
                                        <span className="text-[9px] text-muted-foreground font-medium uppercase truncate max-w-[120px] print:text-slate-500">{task.title}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity no-print" onClick={() => deleteTask(task.id)}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                        {completed.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground italic text-xs print:py-4 print:text-left print:text-black font-medium">
                                No completed interventions logged yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-3 bg-muted/10 border-t flex items-center gap-3 no-print">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-[9px] font-medium leading-tight text-muted-foreground">
                        This list serves as your official remediation register. Keep it updated to ensure a smooth departmental moderation visit.
                    </p>
                </div>
            </div>
        </div>
      </div>

      <RemediationWorksheetDialog 
        open={isWorksheetOpen}
        onOpenChange={setIsWorksheetOpen}
        worksheet={worksheetContent}
        isLoading={isGeneratingWorksheet}
        title={activeWorksheetTitle}
      />
    </div>
  );
};