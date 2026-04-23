"use client";

import React, { useMemo } from 'react';
import { AssessmentQuestion, CognitiveLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TopicCombobox } from "./TopicCombobox";
import { Trash2, ArrowUp, ArrowDown, Plus, Library, FileSpreadsheet, ListChecks, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuestionBuilderProps {
  questions: AssessmentQuestion[];
  onChange: (questions: AssessmentQuestion[]) => void;
  topicSuggestions: string[];
  onOpenBulk: () => void;
  onOpenReuse: () => void;
  disabled?: boolean;
}

export const QuestionBuilder = ({ 
  questions, 
  onChange, 
  topicSuggestions, 
  onOpenBulk, 
  onOpenReuse, 
  disabled 
}: QuestionBuilderProps) => {

  const addQuestion = () => {
    const nextNum = questions.length + 1;
    onChange([...questions, {
      id: crypto.randomUUID(),
      question_number: `Q${nextNum}`,
      skill_description: "",
      topic: "",
      cognitive_level: "knowledge",
      max_mark: 10
    }]);
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (index: number, updates: Partial<AssessmentQuestion>) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], ...updates };
    onChange(newQ);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newQ = [...questions];
    [newQ[index - 1], newQ[index]] = [newQ[index], newQ[index - 1]];
    onChange(newQ);
  };

  const moveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQ = [...questions];
    [newQ[index + 1], newQ[index]] = [newQ[index], newQ[index + 1]];
    onChange(newQ);
  };

  // Compute duplicate labels to show warnings
  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
        const lbl = (q.question_number || '').trim().toLowerCase();
        if (lbl) counts[lbl] = (counts[lbl] || 0) + 1;
    });
    return counts;
  }, [questions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold">Question Builder</h4>
            <Badge className="ml-2" variant="secondary">{questions.length} Qs</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenReuse}
                disabled={disabled}
                className="h-8 flex-1 sm:flex-none"
            >
                <Library className="h-3 w-3 mr-1.5" /> Reuse
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenBulk}
                disabled={disabled}
                className="h-8 flex-1 sm:flex-none"
            >
                <FileSpreadsheet className="h-3 w-3 mr-1.5" /> Bulk Import
            </Button>
            <Button 
                variant="default" 
                size="sm" 
                onClick={addQuestion}
                disabled={disabled}
                className="h-8 w-full sm:w-auto"
            >
                <Plus className="h-3 w-3 mr-1.5" /> Add Row
            </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-background w-full overflow-x-auto no-scrollbar [&>div]:overflow-x-auto [&>div]:overflow-y-visible">
        <Table className="table-fixed min-w-[700px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center"></TableHead>
              <TableHead className="w-24 text-[10px] font-black uppercase">Q Label</TableHead>
              <TableHead className="text-[10px] font-black uppercase w-40">Topic</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Skill / Desc</TableHead>
              <TableHead className="w-32 text-[10px] font-black uppercase">Cog Level</TableHead>
              <TableHead className="w-20 text-[10px] font-black uppercase text-center">Max</TableHead>
              <TableHead className="w-12 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q, idx) => {
              const lblStr = (q.question_number || '').trim().toLowerCase();
              const isDuplicate = lblStr && labelCounts[lblStr] > 1;
              const isMissingLabel = !(q.question_number || '').trim();
              const isInvalidMark = !q.max_mark || isNaN(q.max_mark) || q.max_mark <= 0;
              const hasError = isDuplicate || isMissingLabel || isInvalidMark;

              return (
                <TableRow key={q.id} className={cn("group transition-colors", hasError && "bg-red-50/30")}>
                  <TableCell className="p-1 text-center align-middle">
                    <div className="flex flex-col items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0 || disabled} className="hover:text-primary disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => moveDown(idx)} disabled={idx === questions.length - 1 || disabled} className="hover:text-primary disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 align-top relative">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Input 
                              value={q.question_number || ""} 
                              onChange={(e) => updateQuestion(idx, { question_number: e.target.value })}
                              disabled={disabled}
                              className={cn("h-8 text-xs font-bold", (isDuplicate || isMissingLabel) && "border-red-500 focus-visible:ring-red-500 pr-6")}
                              placeholder="Q1"
                            />
                            {(isDuplicate || isMissingLabel) && (
                              <AlertCircle className="h-3 w-3 text-red-500 absolute right-2 top-2.5" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {(isDuplicate || isMissingLabel) && (
                          <TooltipContent className="bg-red-600 text-white border-none text-xs">
                            {isDuplicate ? "Duplicate question label" : "Question label is required"}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="p-2 align-top">
                    <TopicCombobox
                        value={q.topic || ""}
                        onChange={(val) => updateQuestion(idx, { topic: val })}
                        suggestions={topicSuggestions}
                        placeholder="Select..."
                        className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell className="p-2 align-top">
                    <Input 
                        value={q.skill_description || ""} 
                        onChange={(e) => updateQuestion(idx, { skill_description: e.target.value })}
                        disabled={disabled}
                        className="h-8 text-xs"
                        placeholder="e.g. Solve for x"
                    />
                  </TableCell>
                  <TableCell className="p-2 align-top">
                    <Select value={q.cognitive_level || "knowledge"} onValueChange={(v: CognitiveLevel) => updateQuestion(idx, { cognitive_level: v })} disabled={disabled}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="knowledge">Knowledge</SelectItem>
                            <SelectItem value="comprehension">Comprehension</SelectItem>
                            <SelectItem value="application">Application</SelectItem>
                            <SelectItem value="analysis">Analysis</SelectItem>
                            <SelectItem value="evaluation">Evaluation</SelectItem>
                            <SelectItem value="creation">Creation</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2 align-top relative">
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Input 
                                type="number"
                                value={q.max_mark || ""} 
                                onChange={(e) => updateQuestion(idx, { max_mark: parseInt(e.target.value) || 0 })}
                                disabled={disabled}
                                className={cn("h-8 text-xs text-center font-bold", isInvalidMark && "border-red-500 focus-visible:ring-red-500")}
                            />
                          </div>
                        </TooltipTrigger>
                        {isInvalidMark && (
                          <TooltipContent className="bg-red-600 text-white border-none text-xs">
                            Valid Max Mark is required
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="p-1 text-center align-middle">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeQuestion(q.id)}
                        disabled={disabled}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {questions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <span className="text-xs italic">No questions added. Create one manually or use Bulk Import/Reuse.</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {questions.length > 0 && (
            <div className="border-t p-2 px-4 flex justify-end">
                <span className="text-xs font-bold text-primary">
                    Calculated Total: {questions.reduce((sum, q) => sum + (q.max_mark || 0), 0)} Marks
                </span>
            </div>
        )}
      </div>
    </div>
  );
};