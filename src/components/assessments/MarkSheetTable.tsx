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
  BarChart2, MoreHorizontal, Trash2, TrendingUp, ArrowUp, ArrowDown, AlertCircle, MessageSquare, PaintBucket, Eraser, ArrowUpDown, Zap, Mic
} from 'lucide-react';
import { Assessment, Learner } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { parseMarkInput } from "@/utils/marks";
import { showSuccess } from "@/utils/toast";
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
  deleteAssessment: (id: string) => void;
  getMarkValue: (assId: string, lId: string) => string;
  getMarkComment: (assId: string, lId: string) => string;
  handleMarkChange: (assId: string, lId: string, val: string) => void;
  handleCommentChange: (assId: string, lId: string, val: string) => void;
  handleBulkColumnUpdate?: (assId: string, val: string) => void;
  calculateLearnerTotal: (lId: string) => string;
  getAssessmentStats: (assId: string) => { avg: string; max: string | number; min: string | number };
  onViewLearnerProfile?: (learner: Learner) => void;
  onSort?: (key: string) => void;
  onOpenTool?: (type: 'rapid' | 'voice', assId: string) => void;
}

export const MarkSheetTable = ({
  assessments, visibleAssessments, filteredLearners, currentViewTermName,
  isLocked, isUsingVisibleTotal, atRiskThreshold, sortConfig, setIsAddOpen,
  openAnalytics, deleteAssessment, getMarkValue, getMarkComment, handleMarkChange, handleCommentChange, handleBulkColumnUpdate,
  calculateLearnerTotal, getAssessmentStats, onViewLearnerProfile, onSort, onOpenTool
}: MarkSheetTableProps) => {

  const [noteDialog, setNoteDialog] = useState<{ open: boolean; assId: string; learnerId: string; learnerName: string; comment: string }>({ 
    open: false, assId: '', learnerId: '', learnerName: '', comment: '' 
  });

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
    const { value, isCalculated, raw } = parseMarkInput(currentValue);
    
    if (isCalculated && value !== currentValue) {
       const assessment = assessments.find(a => a.id === assId);
       if (assessment) {
           const percent = parseFloat(value);
           const scaledScore = (percent / 100) * assessment.max_mark;
           const finalScore = scaledScore % 1 === 0 ? scaledScore.toString() : scaledScore.toFixed(1);
           
           handleMarkChange(assId, learnerId, finalScore);
           showSuccess(`Scaled: ${raw} -> ${finalScore}/${assessment.max_mark}`);
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
      <div className="p-12 text-center text-muted-foreground bg-white dark:bg-card border-2 border-dashed rounded-lg">
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
      <div className="border bg-white dark:bg-card rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <Table className="border-collapse">
            <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-[220px] sticky left-0 bg-muted/80 dark:bg-card z-10 border-r backdrop-blur-sm">
                    <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none p-1"
                        onClick={() => onSort && onSort('name')}
                    >
                    Learner Name
                    {getSortIcon('name')}
                    <Badge variant="outline" className="ml-auto font-normal text-[10px] py-0 bg-background/50">
                        {filteredLearners.length}
                    </Badge>
                    </div>
                </TableHead>
                {visibleAssessments.map(ass => (
                    <TableHead key={ass.id} className="text-center min-w-[150px] border-r">
                    <div className="flex flex-col items-center group relative py-2">
                        <div className="flex items-center gap-1">
                            <div 
                                className="flex items-center gap-1 cursor-pointer hover:bg-muted p-1 rounded transition-colors" 
                                onClick={() => onSort && onSort(ass.id)}
                                title="Click to Sort"
                            >
                                <span className="font-bold text-foreground text-xs uppercase tracking-wide truncate max-w-[110px]">{ass.title}</span>
                                {sortConfig?.key === ass.id && getSortIcon(ass.id)}
                            </div>
                            <button 
                                className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                                onClick={() => openAnalytics(ass)}
                            >
                                <BarChart2 className="h-3 w-3" />
                            </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                        Max: {ass.max_mark} • {ass.weight}%
                        </span>
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
                            <DropdownMenuContent align="end">
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
                            <DropdownMenuItem onClick={() => { deleteAssessment(ass.id); }} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Column
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {handleBulkColumnUpdate && (
                                <>
                                    <DropdownMenuItem onClick={() => { 
                                        const val = prompt("Set value for all learners:", "0");
                                        if (val !== null) handleBulkColumnUpdate(ass.id, val);
                                    }}>
                                        <PaintBucket className="mr-2 h-4 w-4" /> Batch Fill...
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        if (confirm(`Clear all marks in this column?`)) {
                                            handleBulkColumnUpdate(ass.id, "");
                                        }
                                    }}>
                                        <Eraser className="mr-2 h-4 w-4" /> Clear All
                                    </DropdownMenuItem>
                                </>
                            )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                    </div>
                    </TableHead>
                ))}
                <TableHead className="text-center font-bold bg-primary/5 dark:bg-primary/10 min-w-[100px]">
                    <div 
                        className="flex flex-col items-center justify-center cursor-pointer select-none py-2"
                        onClick={() => onSort && onSort('total')}
                    >
                        <div className="flex items-center text-primary text-[10px] uppercase tracking-widest">
                            Term Total {getSortIcon('total')}
                        </div>
                        <span className="text-[9px] font-normal text-muted-foreground mt-0.5">
                            {isUsingVisibleTotal ? "(Visible Only)" : "Weighted %"}
                        </span>
                    </div>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredLearners.map((learner, rowIdx) => {
                const total = learner.id ? parseFloat(calculateLearnerTotal(learner.id)) : 0;
                // Use Amber for 'at risk' as per Calm Classroom principles
                const isAtRisk = total < atRiskThreshold && total > 0;

                return (
                    <TableRow key={learner.id || learner.name} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium sticky left-0 bg-background dark:bg-card z-10 border-r shadow-sm group-hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between px-1">
                        <button 
                            className="hover:underline text-sm truncate max-w-[160px] text-left"
                            onClick={() => onViewLearnerProfile && onViewLearnerProfile(learner)}
                        >
                            {learner.name}
                        </button>
                        {isAtRisk && (
                            <Tooltip>
                            <TooltipTrigger>
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">Needs attention: Below {atRiskThreshold}%</p>
                            </TooltipContent>
                            </Tooltip>
                        )}
                        </div>
                    </TableCell>
                    {visibleAssessments.map((ass, colIdx) => {
                        const comment = learner.id ? getMarkComment(ass.id, learner.id) : "";
                        const markValue = getMarkValue(ass.id, learner.id || '');
                        
                        return (
                        <TableCell key={ass.id} className="p-0 border-r last:border-r-0">
                            <ContextMenu>
                            <ContextMenuTrigger>
                                <div className="flex items-center justify-center h-10 w-full relative">
                                <input
                                    id={`cell-${colIdx}-${rowIdx}`}
                                    className={cn(
                                        "h-full w-full bg-transparent text-center text-sm outline-none transition-all",
                                        "focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary/30",
                                        isLocked && "bg-muted/50 cursor-not-allowed text-muted-foreground",
                                        comment && "font-semibold underline decoration-dotted decoration-primary/50 underline-offset-4"
                                    )}
                                    value={markValue}
                                    onChange={(e) => learner.id && handleMarkChange(ass.id, learner.id, e.target.value)}
                                    onBlur={(e) => learner.id && handleInputBlur(ass.id, learner.id, e.target.value)}
                                    onKeyDown={(e) => handleGridKeyDown(e, colIdx, rowIdx)}
                                    disabled={!learner.id || !!isLocked}
                                    placeholder="-"
                                />
                                {comment && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary/40 rounded-full" />
                                )}
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem 
                                onClick={() => learner.id && openNoteDialog(ass.id, learner.id, learner.name)}
                                disabled={!learner.id || !!isLocked}
                                >
                                <MessageSquare className="mr-2 h-4 w-4" /> 
                                {comment ? "Edit observation" : "Add observation"}
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem 
                                onClick={() => learner.id && handleMarkChange(ass.id, learner.id, "")}
                                disabled={!learner.id || !!isLocked}
                                >
                                <Eraser className="mr-2 h-4 w-4" /> Clear
                                </ContextMenuItem>
                            </ContextMenuContent>
                            </ContextMenu>
                        </TableCell>
                        );
                    })}
                    <TableCell className={cn(
                        "text-center font-bold text-sm bg-primary/5 dark:bg-primary/10 transition-colors",
                        isAtRisk ? "text-amber-600" : "text-primary"
                    )}>
                        {learner.id ? total.toFixed(1) : '-'}
                    </TableCell>
                    </TableRow>
                );
                })}

                <TableRow className="bg-muted/50 dark:bg-muted/20 border-t-2">
                <TableCell className="font-bold sticky left-0 bg-muted dark:bg-muted/90 z-10 border-r text-[10px] uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Averages
                    </div>
                </TableCell>
                {visibleAssessments.map(ass => {
                    const stats = getAssessmentStats(ass.id);
                    return (
                    <TableCell key={ass.id} className="text-center p-2 border-r last:border-r-0">
                        <div className="flex flex-col text-[10px] leading-tight cursor-help" title={`Max: ${stats.max} | Min: ${stats.min}`}>
                        <div className="font-bold text-foreground">{stats.avg}%</div>
                        <div className="text-muted-foreground opacity-70">Mean</div>
                        </div>
                    </TableCell>
                    );
                })}
                <TableCell className="bg-primary/10"></TableCell>
                </TableRow>
            </TableBody>
            </Table>
        </div>
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Observation for {noteDialog.learnerName}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="observation-note" className="text-xs uppercase tracking-wider text-muted-foreground">Note / Comment</Label>
                <textarea 
                    id="observation-note"
                    className="w-full min-h-[100px] bg-muted/30 border rounded-md p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                    value={noteDialog.comment} 
                    onChange={(e) => setNoteDialog(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="e.g. Needs support with fractions..."
                    autoFocus
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={saveNote}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};