"use client";

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentQuestion, Assessment, ClassInfo, CognitiveLevel } from '@/lib/types';
import { Search, Library, ArrowRight, ChevronLeft, LayoutList, CheckSquare } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface ReuseQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: AssessmentQuestion[], mode: 'append' | 'replace') => void;
  existingQuestionsCount?: number;
}

export const ReuseQuestionsDialog = ({ open, onOpenChange, onImport, existingQuestionsCount = 0 }: ReuseQuestionsDialogProps) => {
  const [step, setStep] = useState<'select_assessment' | 'select_questions'>('select_assessment');
  const [search, setSearch] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const allAssessments = useLiveQuery(() => db.assessments.toArray()) || [];
  const allClasses = useLiveQuery(() => db.classes.toArray()) || [];

  const classMap = useMemo(() => {
    const map = new Map<string, any>();
    allClasses.forEach(c => map.set(c.id, c));
    return map;
  }, [allClasses]);

  const bankAssessments = useMemo(() => {
    return allAssessments
      .filter(a => a.questions && a.questions.length > 0)
      .map(a => {
        const cls = classMap.get(a.class_id);
        return {
          ...a,
          subject: (cls?.subject || 'Unknown Subject'),
          grade: (cls?.grade || 'Unknown Grade'),
          className: (cls?.className || 'Unknown Class')
        };
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [allAssessments, classMap]);

  const filteredAssessments = useMemo(() => {
    if (!search.trim()) return bankAssessments;
    const lowerSearch = search.toLowerCase();
    return bankAssessments.filter(a => 
      (a.title || '').toLowerCase().includes(lowerSearch) ||
      (a.subject || '').toLowerCase().includes(lowerSearch) ||
      (a.grade || '').toLowerCase().includes(lowerSearch)
    );
  }, [bankAssessments, search]);

  const selectedAssessment = useMemo(() => {
    return bankAssessments.find(a => a.id === selectedAssessmentId) || null;
  }, [bankAssessments, selectedAssessmentId]);

  useEffect(() => {
    if (open) {
      setStep('select_assessment');
      setSearch('');
      setSelectedAssessmentId(null);
      setSelectedQuestionIds(new Set());
      setImportMode('append');
    }
  }, [open]);

  useEffect(() => {
    if (step === 'select_questions' && selectedAssessment?.questions) {
      setSelectedQuestionIds(new Set(selectedAssessment.questions.map(q => q.id)));
    }
  }, [step, selectedAssessment]);

  const handleNextStep = () => {
    if (!selectedAssessmentId) return;
    setStep('select_questions');
  };

  const toggleQuestion = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedQuestionIds(next);
  };

  const toggleAllQuestions = () => {
    if (!selectedAssessment?.questions) return;
    if (selectedQuestionIds.size === selectedAssessment.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(selectedAssessment.questions.map(q => q.id)));
    }
  };

  const handleConfirmImport = () => {
    if (!selectedAssessment?.questions || selectedQuestionIds.size === 0) {
      showError("Please select at least one question to import.");
      return;
    }

    const questionsToImport = selectedAssessment.questions
      .filter(q => selectedQuestionIds.has(q.id))
      .map(q => ({
        ...q,
        id: crypto.randomUUID()
      }));

    onImport(questionsToImport, importMode);
    onOpenChange(false);
  };

  const getCognitiveColor = (level?: CognitiveLevel | string) => {
    switch(level) {
        case 'knowledge': return "bg-slate-100 text-slate-700";
        case 'comprehension': return "bg-blue-50 text-blue-700";
        case 'application': return "bg-green-50 text-green-700";
        case 'analysis': return "bg-purple-50 text-purple-700";
        case 'evaluation': return "bg-amber-50 text-amber-700";
        case 'creation': return "bg-red-50 text-red-700";
        default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
          "flex flex-col p-0 overflow-hidden transition-all duration-300",
          step === 'select_assessment' ? "max-w-3xl h-[80vh]" : "max-w-[95vw] w-[1000px] h-[85vh]"
      )}>
        <div className="p-6 pb-4 border-b bg-muted/10 shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Library className="h-5 w-5 text-primary" />
                        Question Bank
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'select_assessment' 
                            ? "Browse your past assessments to reuse existing questions and metadata." 
                            : `Review and select questions from "${selectedAssessment?.title || ''}".`}
                    </DialogDescription>
                </div>
                {step === 'select_questions' && (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        Step 2 of 2
                    </Badge>
                )}
            </div>
          </DialogHeader>
        </div>

        {step === 'select_assessment' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-background shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by title, subject, or grade..." 
                            className="pl-9"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-muted/5 p-4">
                    <div className="grid gap-3">
                        {filteredAssessments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center space-y-3">
                                <LayoutList className="h-12 w-12 opacity-20" />
                                <div>
                                    <p className="font-semibold text-foreground">No assessments found</p>
                                    <p className="text-sm">Assessments with questions will appear here for reuse.</p>
                                </div>
                            </div>
                        ) : (
                            filteredAssessments.map(ass => (
                                <button
                                    key={ass.id}
                                    onClick={() => setSelectedAssessmentId(ass.id)}
                                    className={cn(
                                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border text-left transition-all group",
                                        selectedAssessmentId === ass.id 
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                            : "bg-background hover:border-primary/40 hover:shadow-sm"
                                    )}
                                >
                                    <div className="space-y-1.5 min-w-0 pr-4">
                                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                                            {ass.title || "Untitled Assessment"}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <Badge variant="secondary" className="text-[10px] uppercase font-black px-1.5 h-4">
                                                {ass.grade || "N/A"}
                                            </Badge>
                                            <span className="truncate max-w-[150px]">{ass.subject || "N/A"}</span>
                                            <span>•</span>
                                            <span>{ass.type || "N/A"}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 sm:mt-0 flex items-center gap-4 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary leading-none">{ass.questions?.length || 0}</p>
                                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Questions</p>
                                        </div>
                                        <div className="w-10 flex justify-end">
                                            <ArrowRight className={cn(
                                                "h-5 w-5 transition-all",
                                                selectedAssessmentId === ass.id ? "text-primary translate-x-1" : "text-muted-foreground opacity-30 group-hover:opacity-100"
                                            )} />
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 border-t bg-background shrink-0 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleNextStep} disabled={!selectedAssessmentId} className="font-bold">
                        Continue to Questions <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                <div className="p-4 border-b bg-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => setStep('select_assessment')} className="h-8 px-2">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                            {selectedQuestionIds.size} of {selectedAssessment?.questions?.length || 0} selected
                        </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Import Mode:</label>
                        <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                            <SelectTrigger className="w-44 h-8 bg-background font-bold text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="append">Append to existing</SelectItem>
                                <SelectItem value="replace" disabled={existingQuestionsCount === 0} className="text-destructive font-bold">Replace existing</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="border rounded-xl shadow-sm bg-background overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <Checkbox 
                                            checked={selectedAssessment?.questions && selectedAssessment.questions.length > 0 && selectedQuestionIds.size === selectedAssessment.questions.length}
                                            onCheckedChange={toggleAllQuestions}
                                        />
                                    </TableHead>
                                    <TableHead className="w-20 text-[10px] font-black uppercase">Num</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Skill / Description</TableHead>
                                    <TableHead className="w-44 text-[10px] font-black uppercase">Topic</TableHead>
                                    <TableHead className="w-32 text-[10px] font-black uppercase">Cognitive</TableHead>
                                    <TableHead className="w-20 text-[10px] font-black uppercase text-center">Max</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedAssessment?.questions?.map(q => (
                                    <TableRow 
                                        key={q.id} 
                                        className={cn("cursor-pointer transition-colors hover:bg-muted/30", selectedQuestionIds.has(q.id) ? "bg-primary/[0.02]" : "opacity-70")}
                                        onClick={() => toggleQuestion(q.id)}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox checked={selectedQuestionIds.has(q.id)} />
                                        </TableCell>
                                        <TableCell className="font-bold text-xs">{q.question_number || "-"}</TableCell>
                                        <TableCell className="text-sm font-medium">{q.skill_description || "-"}</TableCell>
                                        <TableCell>
                                            {q.topic ? <Badge variant="outline" className="text-[10px] bg-white">{q.topic}</Badge> : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {q.cognitive_level && q.cognitive_level !== 'unknown' ? (
                                                <Badge className={cn("text-[9px] uppercase font-black border-none px-1.5", getCognitiveColor(q.cognitive_level))}>
                                                    {q.cognitive_level}
                                                </Badge>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm">{q.max_mark || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t bg-background shrink-0 flex justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Imported questions will be added to your current assessment and can be edited further.
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
                        <Button 
                            onClick={handleConfirmImport} 
                            disabled={selectedQuestionIds.size === 0}
                            className="font-bold flex-1 sm:flex-none gap-2"
                        >
                            <CheckSquare className="h-4 w-4" />
                            Import {selectedQuestionIds.size} Questions
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};