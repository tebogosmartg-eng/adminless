"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
import { 
  BarChart2, MoreHorizontal, Trash2, TrendingUp, ArrowUp, ArrowDown, AlertCircle, MessageSquare, PaintBucket, Eraser, ArrowUpDown, Zap, Mic, Layers, Settings2, CheckSquare, ListChecks, BarChart3, Grid3X3, AlertTriangle, SlidersHorizontal
} from 'lucide-react';
import { Assessment, Learner } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { parseMarkInput } from "@/utils/marks";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface MarkSheetTableProps {
  assessments: Assessment[]; 
  visibleAssessments: Assessment[];
  filteredLearners: Learner[];
  currentViewTermName: string | undefined;
  isLocked: boolean | undefined;
  isUsingVisibleTotal: boolean;
  atRiskThreshold: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  setIsAddOpen: (open: boolean) => void;
  openAnalytics: (ass: Assessment) => void;
  onOpenDiagnostic?: (ass: Assessment) => void;
  onOpenQuestionGrid?: (assId: string) => void;
  deleteAssessment: (id: string) => void;
  onEditAssessment?: (ass: Assessment) => void;
  getMarkValue: (assId: string, lId: string) => string;
  getMarkComment: (assId: string, lId: string) => string;
  handleMarkChange: (assId: string, lId: string, val: string) => void;
  handleCommentChange: (assId: string, lId: string, val: string) => void;
  handleBulkColumnUpdate?: (assId: string, val: string) => void;
  calculateLearnerTotal: (lId: string) => string;
  getAssessmentStats: (assId: string) => { avg: string; max: string | number; min: string | number };
  onViewLearnerProfile?: (learner: Learner) => void;
  onSort?: (key: string) => void;
  onSortConfig?: { key: string; direction: 'asc' | 'desc' };
  onOpenTool?: (type: 'rapid' | 'voice', assId: string) => void;
  onOpenRubric?: (assId: string, learner: Learner) => void;
  onOpenQuestions?: (assId: string, learner: Learner) => void;
  validateAndCommitMark?: (assId: string, lId: string, val: string) => Promise<boolean> | boolean;
  onApplyModeration?: (assId: string, adjustment: number) => void;
}

export const MarkSheetTable = ({
  assessments, visibleAssessments, filteredLearners, currentViewTermName,
  isLocked, isUsingVisibleTotal, atRiskThreshold, sortConfig, setIsAddOpen,
  openAnalytics, onOpenDiagnostic, onOpenQuestionGrid, deleteAssessment, onEditAssessment, getMarkValue, getMarkComment, handleMarkChange, handleCommentChange, handleBulkColumnUpdate,
  calculateLearnerTotal, getAssessmentStats, onViewLearnerProfile, onSort, onOpenTool, onOpenRubric, onOpenQuestions,
  validateAndCommitMark, onApplyModeration
}: MarkSheetTableProps) => {

  const [noteDialog, setNoteDialog] = useState<{ open: boolean; assId: string; learnerId: string; learnerName: string; comment: string }>({ 
    open: false, assId: '', learnerId: '', learnerName: '', comment: '' 
  });
  
  const [activeRow, setActiveRow] = useState<number | null>(null);

  // Compute live Risk Flags chronologically
  const highRiskCells = useMemo(() => {
    const riskSet = new Set<string>();
    if (!assessments || assessments.length === 0) return riskSet;

    // Ensure strictly chronological ordering to build historical averages
    const sortedAss = [...assessments].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    filteredLearners.forEach(learner => {
      if (!learner.id) return;
      let runningSum = 0;
      let runningCount = 0;

      sortedAss.forEach(ass => {
        const markStr = getMarkValue(ass.id, learner.id!);
        if (markStr && markStr !== "") {
          const markNum = parseFloat(markStr);
          if (!isNaN(markNum) && ass.max_mark > 0) {
            const percentage = (markNum / ass.max_mark) * 100;

            // If we have history, check for a > 5% drop into the danger zone
            if (runningCount > 0) {
              const prevAvg = runningSum / runningCount;
              if (percentage < atRiskThreshold && percentage <= prevAvg - 5) {
                riskSet.add(`${ass.id}-${learner.id}`);
              }
            }

            // Append to history for the next assessment
            runningSum += percentage;
            runningCount++;
          }
        }
      });
    });

    return riskSet;
  }, [assessments, filteredLearners, getMarkValue, atRiskThreshold]);

  const openNoteDialog = (assId: string, learnerId: string, learnerName: string) => {
    setNoteDialog({ 
      open: true, 
      assId, 
      learnerId, 
      learnerName, 
      comment: getMarkComment(assId, learnerId) 
    });
  };

  const saveNote = () => {
    handleCommentChange(noteDialog.assId, noteDialog.learnerId, noteDialog.comment);
    setNoteDialog(prev => ({ ...prev, open: false }));
  };

  const handleInputBlur = (assId: string, learnerId: string, currentValue: string) => {
    if (validateAndCommitMark) {
        validateAndCommitMark(assId, learnerId, currentValue);
    }
  };

  const handleBulkUpdate = (assId: string, value: string, label: string) => {
      if (confirm(`Set all marks in this column to ${label}? This will overwrite existing marks.`)) {
          if (handleBulkColumnUpdate) handleBulkColumnUpdate(assId, value);
          showSuccess(`Column updated to ${label}.`);
      }
  };

  const handleModeration = (assId: string) => {
      const adj = prompt("Enter moderation adjustment (%) to apply to all marks in this column (e.g., '5' or '-2'):");
      if (adj !== null) {
          const num = parseFloat(adj);
          if (!isNaN(num) && onApplyModeration) {
              onApplyModeration(assId, num);
          } else {
              showError("Invalid adjustment value.");
          }
      }
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, colIdx: number, rowIdx: number) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const nextRow = Math.min(filteredLearners.length - 1, rowIdx + 1);
        const nextEl = document.getElementById(`cell-${colIdx}-${nextRow}`);
        if (nextEl) {
            (nextEl as HTMLInputElement).focus();
            (nextEl as HTMLInputElement).select();
        }
        return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let nextRow = rowIdx;
        let nextCol = colIdx;

        if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);
        if (e.key === 'ArrowDown') nextRow = Math.min(filteredLearners.length - 1, rowIdx + 1);
        if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIdx - 1);
        if (e.key === 'ArrowRight') nextCol = Math.min(visibleAssessments.length - 1, colIdx + 1);

        const nextEl = document.getElementById(`cell-${nextCol}-${nextRow}`);
        if (nextEl) {
            (nextEl as HTMLInputElement).focus();
            setTimeout(() => (nextEl as HTMLInputElement).select(), 0);
        }
    }
  };

  if (assessments.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground bg-card border-2 border-dashed border-border rounded-lg">
        <p className="mb-2">No assessments found for {currentViewTermName}.</p>
        <p className="text-sm opacity-70 mb-6">Create a new task to begin recording marks.</p>
        {!isLocked && (
          <Button variant="outline" onClick={() => setIsAddOpen(true)}>Create Assessment</Button>
        )}
      </div>
    );
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <>
      <div className="border border-border bg-card rounded-md overflow-hidden shadow-sm w-full max-w-full">
        <div className="overflow-x-auto w-full">
            <Table className="border-collapse table-fixed w-full min-w-max">
            <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border h-12">
                <TableHead className="w-[140px] sm:w-[220px] sticky left-0 bg-muted/90 dark:bg-muted/50 z-20 border-r border-border backdrop-blur-sm">
                    <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none"
                        onClick={() => onSort && onSort('name')}
                    >
                    Learner Name
                    {getSortIcon('name')}
                    </div>
                </TableHead>
                {visibleAssessments.map(ass => (
                    <TableHead key={ass.id} className="text-center min-w-[120px] border-r border-border">
                    <div className="flex flex-col items-center group relative py-1">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-foreground text-[11px] uppercase tracking-wide truncate max-w-[90px]">{ass.title}</span>
                            <button 
                                className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                                onClick={() => openAnalytics(ass)}
                                title="View Statistics"
                            >
                                <BarChart2 className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 justify-center">
                            <span className="text-[9px] text-muted-foreground font-normal">
                              {ass.max_mark} • {ass.weight}%
                            </span>
                            {ass.rubric_id && <Layers className="h-2.5 w-2.5 text-primary opacity-60" />}
                            {ass.questions && ass.questions.length > 0 && <ListChecks className="h-2.5 w-2.5 text-blue-500 opacity-60" />}
                        </div>
                        {!isLocked && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                            {onOpenTool && (
                                <>
                                    <DropdownMenuItem onClick={() => onOpenTool('rapid', ass.id)}>
                                        <Zap className="mr-2 h-4 w-4 text-amber-500" /> Rapid Entry
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onOpenTool('voice', ass.id)}>
                                        <Mic className="mr-2 h-4 w-4 text-blue-500" /> Voice Entry
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {ass.questions && ass.questions.length > 0 && onOpenQuestionGrid && (
                                <>
                                    <DropdownMenuItem onClick={() => onOpenQuestionGrid(ass.id)} className="font-bold text-blue-600">
                                        <Grid3X3 className="mr-2 h-4 w-4" /> Rapid Grid Entry
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {ass.questions && ass.questions.length > 0 && onOpenDiagnostic && (
                                <>
                                    <DropdownMenuItem onClick={() => onOpenDiagnostic(ass)} className="font-bold text-primary">
                                        <BarChart3 className="mr-2 h-4 w-4" /> Diagnostic Analysis
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={() => handleBulkUpdate(ass.id, ass.max_mark.toString(), 'Max Marks')}>
                                <CheckSquare className="mr-2 h-4 w-4 text-green-600" /> Fill Max Marks
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleModeration(ass.id)}>
                                <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" /> Apply Moderation (%)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkUpdate(ass.id, "", 'Empty')}>
                                <Eraser className="mr-2 h-4 w-4 text-orange-500" /> Clear Column
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {onEditAssessment && (
                              <DropdownMenuItem onClick={() => onEditAssessment(ass)}>
                                <Settings2 className="mr-2 h-4 w-4" /> Column Settings
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { deleteAssessment(ass.id); }} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Column
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                    </div>
                    </TableHead>
                ))}
                <TableHead className="text-center font-bold bg-primary/5 dark:bg-primary/10 min-w-[80px]">
                    <div className="flex flex-col items-center justify-center text-[10px] uppercase tracking-widest text-primary">
                        Total
                    </div>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredLearners.map((learner, rowIdx) => {
                const total = learner.id ? parseFloat(calculateLearnerTotal(learner.id)) : 0;
                const isAtRisk = total < atRiskThreshold && total > 0;
                const isRowFocused = activeRow === rowIdx;

                return (
                    <TableRow 
                      key={learner.id || learner.name} 
                      className={cn(
                        "group transition-all h-10 border-border",
                        isRowFocused ? "bg-primary/5 shadow-inner" : "hover:bg-muted/30"
                      )}
                    >
                    <TableCell 
                      className={cn(
                        "font-medium sticky left-0 z-10 border-r border-border shadow-sm transition-colors",
                        isRowFocused ? "bg-primary/10" : "bg-background dark:bg-card"
                      )}
                    >
                        <div className="flex items-center justify-between px-1">
                        <button 
                            className="hover:underline text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[160px] text-left text-foreground"
                            onClick={() => onViewLearnerProfile && onViewLearnerProfile(learner)}
                        >
                            {learner.name}
                        </button>
                        {isAtRisk && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                    </TableCell>
                    {visibleAssessments.map((ass, colIdx) => {
                        const comment = learner.id ? getMarkComment(ass.id, learner.id) : "";
                        const markValue = getMarkValue(ass.id, learner.id || '');
                        const hasQuestions = ass.questions && ass.questions.length > 0;
                        const isHighRiskCell = learner.id ? highRiskCells.has(`${ass.id}-${learner.id}`) : false;
                        
                        return (
                        <TableCell key={ass.id} className="p-0 border-r border-border last:border-r-0 relative min-w-[60px]">
                            <ContextMenu>
                            <ContextMenuTrigger>
                                <div className="flex items-center justify-center h-10 w-full relative group/cell">
                                <input
                                    id={`cell-${colIdx}-${rowIdx}`}
                                    className={cn(
                                        "h-full w-full bg-transparent text-center text-sm outline-none transition-all",
                                        "border border-transparent hover:border-muted-foreground/20 text-foreground",
                                        "focus:bg-background focus:ring-2 focus:ring-primary focus:z-10",
                                        isLocked && "bg-muted/50 cursor-not-allowed text-muted-foreground",
                                        comment && "font-bold text-primary",
                                        hasQuestions && "border-blue-200/30 dark:border-blue-800/30",
                                        isHighRiskCell && "text-red-600 font-bold bg-red-50/20 dark:bg-red-950/20"
                                    )}
                                    value={markValue}
                                    onFocus={() => setActiveRow(rowIdx)}
                                    onChange={(e) => learner.id && handleMarkChange(ass.id, learner.id, e.target.value)}
                                    onBlur={(e) => {
                                        if (learner.id) handleInputBlur(ass.id, learner.id, e.target.value);
                                        setActiveRow(null);
                                    }}
                                    onKeyDown={(e) => handleGridKeyDown(e, colIdx, rowIdx)}
                                    disabled={!learner.id || !!isLocked}
                                    placeholder="-"
                                />
                                
                                {hasQuestions && markValue !== "" && (
                                    <div className="absolute top-0 right-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="p-0.5">
                                                    <AlertTriangle className="h-2 w-2 text-amber-500 opacity-70" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-[10px] p-1">
                                                Manual override: This assessment has a question breakdown.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                                
                                {ass.rubric_id && !isLocked && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 absolute right-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary hidden sm:inline-flex"
                                        onClick={() => onOpenRubric && onOpenRubric(ass.id, learner)}
                                        title="Mark with Rubric"
                                    >
                                        <Layers className="h-3 w-3" />
                                    </Button>
                                )}

                                {hasQuestions && !isLocked && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 absolute right-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-600 hidden sm:inline-flex"
                                        onClick={() => onOpenQuestions && onOpenQuestions(ass.id, learner)}
                                        title="Question-Level marking"
                                    >
                                        <ListChecks className="h-3 w-3" />
                                    </Button>
                                )}

                                {comment && (
                                    <div className="absolute top-1 left-1">
                                        <MessageSquare className="h-2 w-2 text-primary opacity-50" />
                                    </div>
                                )}

                                {isHighRiskCell && (
                                    <div 
                                        className="absolute bottom-1 right-1 pointer-events-none opacity-80"
                                        title="High Risk: Mark is below threshold and declining from previous average."
                                    >
                                        <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                                    </div>
                                )}
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                {ass.rubric_id && (
                                    <ContextMenuItem onClick={() => onOpenRubric && onOpenRubric(ass.id, learner)}>
                                        <Layers className="mr-2 h-4 w-4" /> Open Rubric Grid
                                    </ContextMenuItem>
                                )}
                                {hasQuestions && (
                                    <>
                                        <ContextMenuItem onClick={() => onOpenQuestionGrid && onOpenQuestionGrid(ass.id)}>
                                            <Grid3X3 className="mr-2 h-4 w-4" /> Open Rapid Grid
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => onOpenQuestions && onOpenQuestions(ass.id, learner)}>
                                            <ListChecks className="mr-2 h-4 w-4" /> Open Question Breakdown
                                        </ContextMenuItem>
                                    </>
                                )}
                                <ContextMenuItem onClick={() => learner.id && openNoteDialog(ass.id, learner.id, learner.name)}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Observation
                                </ContextMenuItem>
                            </ContextMenuContent>
                            </ContextMenu>
                        </TableCell>
                        );
                    })}
                    <TableCell className={cn(
                        "text-center font-bold text-sm transition-colors",
                        isAtRisk ? "text-amber-600 bg-amber-50 dark:bg-amber-900/10" : "text-primary bg-primary/5"
                    )}>
                        {learner.id ? total.toFixed(1) : '-'}
                    </TableCell>
                    </TableRow>
                );
                })}

                <TableRow className="bg-muted/50 border-t-2 border-border h-10">
                <TableCell className="font-bold sticky left-0 bg-muted z-10 border-r border-border text-[9px] uppercase tracking-widest text-muted-foreground px-2">
                    Avg
                </TableCell>
                {visibleAssessments.map(ass => {
                    const stats = getAssessmentStats(ass.id);
                    return (
                    <TableCell key={ass.id} className="text-center p-0 border-r border-border last:border-r-0">
                        <div className="font-bold text-[10px] text-foreground">{stats.avg}%</div>
                    </TableCell>
                    );
                })}
                <TableCell className="bg-primary/10 border-border"></TableCell>
                </TableRow>
            </TableBody>
            </Table>
        </div>
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px] bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm text-foreground">Note for {noteDialog.learnerName}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea 
                className="w-full min-h-[80px] bg-muted/30 border border-border rounded-md p-2 text-sm outline-none resize-none text-foreground"
                value={noteDialog.comment} 
                onChange={(e) => setNoteDialog(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Absent, late, etc..."
                autoFocus
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={saveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};