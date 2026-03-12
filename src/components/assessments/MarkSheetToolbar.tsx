import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Calendar, Eye, AlertCircle, Search, Settings2, Plus, Copy, Upload, Loader2, CheckCircle2, Layers, Info, ShieldCheck, XCircle, Trash2, ListChecks, Library } from 'lucide-react';
import { Assessment, Term, AcademicYear, Rubric, ClassInfo, AssessmentQuestion, CognitiveLevel } from '@/lib/types';
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BulkQuestionImportDialog } from "./BulkQuestionImportDialog";
import { ReuseQuestionsDialog } from "./ReuseQuestionsDialog";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTopicSuggestions } from "@/hooks/useTopicSuggestions";
import { QuestionBuilder } from "./QuestionBuilder";

interface MarkSheetToolbarProps {
  terms: Term[];
  activeTerm: Term | null;
  activeYear: AcademicYear | null;
  viewTermId: string | null;
  setViewTermId: (id: string) => void;
  currentViewTerm: Term | undefined;
  isWeightValid: boolean;
  currentTotalWeight: number;
  isLocked: boolean | undefined;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  editedMarksCount: number;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  setIsImportOpen: (open: boolean) => void;
  setIsCopyOpen: (open: boolean) => void;
  newAss: any;
  setNewAss: (ass: any) => void;
  handleAddAssessment: () => void;
  assessments: Assessment[];
  visibleAssessmentIds: string[];
  toggleAssessmentVisibility: (id: string) => void;
  recalculateTotal: boolean;
  setRecalculateTotal: (recalc: boolean) => void;
  isAutoSaving?: boolean;
  availableRubrics?: Rubric[];
  classInfo?: ClassInfo;
}

export const MarkSheetToolbar = ({
  terms, activeTerm, activeYear, viewTermId, setViewTermId, currentViewTerm,
  isWeightValid, currentTotalWeight, isLocked,
  searchQuery, setSearchQuery, editedMarksCount, 
  isAddOpen, setIsAddOpen, setIsImportOpen, setIsCopyOpen,
  newAss, setNewAss, handleAddAssessment,
  assessments, visibleAssessmentIds, toggleAssessmentVisibility, recalculateTotal, setRecalculateTotal,
  isAutoSaving, availableRubrics = [],
  classInfo
}: MarkSheetToolbarProps) => {

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isReuseOpen, setIsReuseOpen] = useState(false);
  const { progress, missingRequired } = useSetupStatus();
  
  // Fetch historical topics prioritized by this class's subject and grade
  const topicSuggestions = useTopicSuggestions(classInfo?.subject, classInfo?.grade);

  const handleRubricSelect = (val: string) => {
      const rubric = availableRubrics.find(r => r.id === val);
      setNewAss({ 
          ...newAss, 
          rubricId: val,
          max: rubric ? rubric.total_points : newAss.max,
          questions: [] // Rubrics and questions are mutually exclusive for now
      });
  };

  const handleQuestionsChange = (updatedQuestions: AssessmentQuestion[]) => {
      const totalMax = updatedQuestions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
      setNewAss({ 
          ...newAss, 
          questions: updatedQuestions, 
          max: totalMax || newAss.max, 
          rubricId: updatedQuestions.length > 0 ? "none" : newAss.rubricId 
      });
  };

  const handleImportQuestions = (importedQuestions: AssessmentQuestion[], mode: 'append' | 'replace') => {
    let updatedQuestions = [...(newAss.questions || [])];
    if (mode === 'replace') {
        updatedQuestions = importedQuestions;
    } else {
        updatedQuestions = [...updatedQuestions, ...importedQuestions];
    }
    const totalMax = updatedQuestions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
    setNewAss({ ...newAss, questions: updatedQuestions, max: totalMax || newAss.max, rubricId: "none" });
  };

  const targetTermName = terms.find(t => t.id === (newAss.termId || activeTerm?.id))?.name;

  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4">
      <div className="space-y-2 w-full xl:w-auto">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={viewTermId || ""} onValueChange={setViewTermId}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select Term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.id === activeTerm?.id ? "(Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentViewTerm?.closed && <Badge variant="secondary"><Eye className="mr-1 h-3 w-3" /> Read Only</Badge>}
          
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full border transition-all cursor-help",
                        progress === 100 ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                        {progress === 100 ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Setup: {progress}%</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1.5 p-1">
                        <p className="font-bold text-xs">Term Setup Status</p>
                        {progress === 100 ? (
                            <p className="text-[10px]">Your academic context is fully validated and ready for finalisation.</p>
                        ) : (
                            <>
                                <p className="text-[10px] text-muted-foreground">Outstanding requirements:</p>
                                <div className="space-y-1 mt-1">
                                    {missingRequired.slice(0, 3).map(s => (
                                        <div key={s.id} className="flex items-center gap-2 text-[9px] font-medium">
                                            <XCircle className="h-2.5 w-2.5 text-red-500" /> {s.title}
                                        </div>
                                    ))}
                                    {missingRequired.length > 3 && <p className="text-[9px] italic">+ {missingRequired.length - 3} more</p>}
                                </div>
                            </>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-full border border-transparent transition-all">
            {isAutoSaving ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Auto-saving...
                </div>
            ) : editedMarksCount > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                    <AlertCircle className="h-3 w-3" /> Pending changes
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Saved locally
                </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold">
          <span className={isWeightValid ? "text-green-600" : "text-amber-600"}>
            Weighting: {currentTotalWeight}%
          </span>
          {!isWeightValid && <AlertCircle className="h-3 w-3 text-amber-500" />}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 w-full xl:w-auto justify-start sm:justify-end">
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find learner..."
            className="pl-8 h-9 text-sm w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none">
                <Settings2 className="mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">View</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {assessments.map(ass => (
                  <DropdownMenuCheckboxItem
                      key={ass.id}
                      checked={visibleAssessmentIds.includes(ass.id)}
                      onCheckedChange={() => toggleAssessmentVisibility(ass.id)}
                  >
                      {ass.title}
                  </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isLocked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 bg-primary shadow-sm flex-1 sm:flex-none">
                  <Plus className="mr-1 h-4 w-4" /> 
                  <span className="hidden sm:inline">Formal Task</span>
                  <span className="sm:hidden">Task</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New FAT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCopyOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Structure
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Import CSV Marks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden">
            <div className="p-6 pb-2 shrink-0">
                <DialogHeader>
                <DialogTitle>New Formal Assessment Task (FAT)</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Target Term: <span className="font-bold text-foreground">{targetTermName}</span>
                </DialogDescription>
                </DialogHeader>
            </div>

            <ScrollArea className="flex-1 p-6 pt-0">
                <div className="grid gap-6 py-4">
                  <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Task Title</Label>
                          <Input value={newAss.title} onChange={e => setNewAss({ ...newAss, title: e.target.value })} className="col-span-3 h-9" placeholder="e.g. Investigation 1" />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Rubric (Opt)</Label>
                          <Select value={newAss.rubricId || "none"} onValueChange={handleRubricSelect}>
                              <SelectTrigger className="col-span-3 h-9">
                                  <SelectValue placeholder="None (Standard Mark)" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">-- Standard Score --</SelectItem>
                                  {availableRubrics.map(r => (
                                      <SelectItem key={r.id} value={r.id}>
                                          <div className="flex items-center gap-2">
                                              <Layers className="h-3 w-3 text-muted-foreground" />
                                              {r.title} ({r.total_points} pts)
                                          </div>
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Total Marks</Label>
                          <Input 
                              type="number" 
                              value={newAss.max} 
                              onChange={e => setNewAss({ ...newAss, max: parseInt(e.target.value) })} 
                              className="col-span-3 h-9"
                              disabled={!!newAss.rubricId && newAss.rubricId !== 'none' || (newAss.questions && newAss.questions.length > 0)}
                          />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Weighting %</Label>
                          <Input type="number" value={newAss.weight} onChange={e => setNewAss({ ...newAss, weight: parseFloat(e.target.value) })} className="col-span-3 h-9" />
                      </div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                      <QuestionBuilder 
                          questions={newAss.questions || []}
                          onChange={handleQuestionsChange}
                          topicSuggestions={topicSuggestions}
                          disabled={!!newAss.rubricId && newAss.rubricId !== 'none'}
                          onOpenBulk={() => setIsBulkImportOpen(true)}
                          onOpenReuse={() => setIsReuseOpen(true)}
                      />
                  </div>

                  <Button onClick={handleAddAssessment} className="w-full font-bold h-12">Record Assessment</Button>
                </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <BulkQuestionImportDialog 
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImport={handleImportQuestions}
        existingQuestions={newAss.questions}
      />

      <ReuseQuestionsDialog
        open={isReuseOpen}
        onOpenChange={setIsReuseOpen}
        onImport={handleImportQuestions}
        existingQuestionsCount={(newAss.questions || []).length}
      />
    </div>
  );
};