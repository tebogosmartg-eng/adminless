"use client";

import React, { useState } from 'react';
import { Assessment, ClassInfo, Term } from '@/lib/types';
import { db } from '@/db';
import { queueAction } from '@/services/sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    PlusCircle, 
    Link as LinkIcon, 
    Unlink, 
    AlertCircle, 
    CheckCircle2,
    FileText
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TaskSlot {
    key: string;
    label: string;
    description: string;
    required: boolean;
}

const STANDARD_SLOTS: TaskSlot[] = [
    { key: 'assignment', label: 'Assignment / Project', description: 'Major research or practical task.', required: true },
    { key: 'test', label: 'Controlled Test', description: 'Formal written assessment.', required: true },
    { key: 'investigation', label: 'Investigation / Experiment', description: 'Data gathering and analysis task.', required: false },
    { key: 'exam', label: 'Term Examination', description: 'Final summative assessment.', required: false }
];

interface TaskSlotManagerProps {
  term: Term;
  classes: ClassInfo[];
  assessments: Assessment[];
  isLocked?: boolean;
}

export const TaskSlotManager = ({ term, classes, assessments, isLocked }: TaskSlotManagerProps) => {
  const navigate = useNavigate();
  const [activeClassId, setActiveClassId] = useState<string>(classes[0]?.id || "");

  const classAssessments = assessments.filter(a => a.class_id === activeClassId);

  const handleLink = async (slotKey: string, assessmentId: string) => {
    if (isLocked) return;
    try {
        await db.assessments.update(assessmentId, { task_slot_key: slotKey } as any);
        await queueAction('assessments', 'update', { id: assessmentId, task_slot_key: slotKey });
        showSuccess("Assessment linked to portfolio slot.");
    } catch (e) {
        showError("Linking failed.");
    }
  };

  const handleUnlink = async (assessmentId: string) => {
    if (isLocked) return;
    try {
        await db.assessments.update(assessmentId, { task_slot_key: null } as any);
        await queueAction('assessments', 'update', { id: assessmentId, task_slot_key: null });
        showSuccess("Link removed.");
    } catch (e) {
        showError("Unlink failed.");
    }
  };

  const currentClass = classes.find(c => c.id === activeClassId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
          <p className="text-xs text-muted-foreground font-medium">Select class to manage task mappings:</p>
          <Select value={activeClassId} onValueChange={setActiveClassId}>
              <SelectTrigger className="w-[200px] h-8 text-[10px] font-bold uppercase">
                  <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                  {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>
                  ))}
              </SelectContent>
          </Select>
      </div>

      <div className="grid gap-4">
        {STANDARD_SLOTS.map((slot) => {
            const linkedAss = classAssessments.find(a => (a as any).task_slot_key === slot.key);
            
            return (
                <div key={slot.key} className={cn(
                    "p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    linkedAss ? "bg-green-50/30 border-green-100" : "bg-white border-slate-100 hover:border-blue-100"
                )}>
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            linkedAss ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                        )}>
                            {linkedAss ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-sm text-slate-900">{slot.label}</h4>
                                {slot.required && !linkedAss && <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase">Required</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                {linkedAss ? `Linked: ${linkedAss.title}` : slot.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 no-print">
                        {linkedAss ? (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={isLocked}
                                onClick={() => handleUnlink(linkedAss.id)}
                                className="h-8 text-[10px] font-black uppercase text-muted-foreground hover:text-destructive"
                            >
                                <Unlink className="h-3 w-3 mr-1.5" /> Remove Link
                            </Button>
                        ) : (
                            <>
                                <Select onValueChange={(val) => handleLink(slot.key, val)} disabled={isLocked}>
                                    <SelectTrigger className="h-8 w-40 text-[10px] font-black uppercase">
                                        <SelectValue placeholder="Link Existing..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classAssessments.filter(a => !(a as any).task_slot_key).map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                                        ))}
                                        {classAssessments.filter(a => !(a as any).task_slot_key).length === 0 && (
                                            <SelectItem value="none" disabled>No unlinked tasks</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={isLocked}
                                    onClick={() => navigate(`/classes/${activeClassId}`, { state: { highlightId: 'new-task-btn' } })}
                                    className="h-8 text-[10px] font-black uppercase gap-1.5"
                                >
                                    <PlusCircle className="h-3 w-3" /> Create
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
      
      {!isLocked && (
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3 no-print">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-[10px] text-blue-800 leading-tight font-medium">
                  <strong>Standardised Structure:</strong> Mapping assessments to these slots ensures your digital Teacher File correctly organizes tasks for departmental audit, even if your local task names vary.
              </p>
          </div>
      )}
    </div>
  );
};