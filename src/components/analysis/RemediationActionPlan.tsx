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
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RemediationActionPlanProps {
  classId: string;
  termId: string;
}

export const RemediationActionPlan = ({ classId, termId }: RemediationActionPlanProps) => {
  const { tasks, updateTaskStatus, deleteTask } = useRemediation(classId, termId);

  const completed = tasks.filter(t => t.status === 'completed');
  const pending = tasks.filter(t => t.status !== 'completed');

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5 mt-6">
        <Rocket className="h-10 w-10 mb-2 opacity-20" />
        <h3 className="font-bold text-foreground">No Active Remediation Plan</h3>
        <p className="text-xs max-w-xs mt-1">
          Open an Assessment Diagnostic and click "Activate Action Plan" to populate your pedagogical intervention list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Remediation Action Plan
            </h3>
            <p className="text-xs text-muted-foreground">Proof of pedagogical intervention for departmental audit.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-7 px-3 font-black uppercase text-[10px] tracking-widest">
            {completed.length} / {tasks.length} Resolved
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> Active Interventions
            </h4>
            <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                    {pending.map((task) => (
                        <Card key={task.id} className="shadow-none border group hover:border-primary/40 transition-all overflow-hidden">
                            <CardContent className="p-4 flex gap-4">
                                <div className="pt-1">
                                    <Checkbox 
                                        checked={false} 
                                        onCheckedChange={() => updateTaskStatus(task.id, 'completed')}
                                        className="h-5 w-5"
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase text-primary tracking-tighter bg-primary/5 px-1.5 rounded truncate max-w-[150px]">
                                            Source: {task.title}
                                        </span>
                                        <span className="text-[8px] font-bold text-muted-foreground">{format(new Date(task.created_at), 'dd MMM')}</span>
                                    </div>
                                    <p className="text-sm font-bold leading-tight text-foreground/90">{task.description}</p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div className="py-12 text-center text-muted-foreground italic text-xs">
                            No pending interventions. You're all caught up!
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" /> Remediation Proof (Audit Ready)
            </h4>
            <div className="border rounded-xl bg-muted/20 overflow-hidden">
                <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border/50">
                        {completed.map((task) => (
                            <div key={task.id} className="p-4 bg-background/40 flex items-start gap-4 group">
                                <div className="pt-1">
                                    <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                        <Check className="h-3 w-3" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground/70 line-through decoration-muted-foreground/30">
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-green-200 text-green-700 bg-green-50/50">Applied</Badge>
                                        <span className="text-[9px] text-muted-foreground font-medium uppercase truncate max-w-[120px]">{task.title}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTask(task.id)}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                        {completed.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground italic text-xs">
                                No completed interventions logged yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-3 bg-muted/10 border-t flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-[9px] font-medium leading-tight text-muted-foreground">
                        This list serves as your official remediation register. Keep it updated to ensure a smooth departmental moderation visit.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

import { Check } from "lucide-react";