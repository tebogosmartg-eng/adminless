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
      <div className="p-8 text-center text-muted-foreground bg-muted/10 border rounded-md">
        No assessments found for {currentViewTermName}.
        {!isLocked && (
          <div className="mt-4">
            <Button variant="outline" onClick={() => setIsAddOpen(true)}>Create Assessment</Button>
          </div>
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
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] sticky left-0 bg-background z-10 shadow-sm">
                <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort && onSort('name')}
                >
                  Learner
                  {getSortIcon('name')}
                  <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                    {filteredLearners.length}
                  </Badge>
                </div>
              </TableHead>
              {visibleAssessments.map(ass => (
                <TableHead key={ass.id} className="text-center min-w-[140px]">
                  <div className="flex flex-col items-center group relative">
                    <div className="flex items-center gap-1">
                        <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded" 
                            onClick={() => onSort && onSort(ass.id)}
                            title="Click to Sort"
                        >
                            <span className="font-semibold truncate max-w-[100px]">{ass.title}</span>
                            {sortConfig?.key === ass.id && getSortIcon(ass.id)}
                        </div>
                        <div 
                            className="cursor-pointer opacity-50 hover:opacity-100 hover:text-primary transition-opacity"
                            onClick={() => openAnalytics(ass)}
                            title="Analytics"
                        >
                            <BarChart2 className="h-3 w-3" />
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">
                      {ass.max_mark} marks • {ass.weight}%
                    </span>
                    {!isLocked && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 mt-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 top-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {onOpenTool && (
                            <>
                                <DropdownMenuItem onClick={() => onOpenTool('rapid', ass.id)}>
                                    <Zap className="mr-2 h-4 w-4 text-orange-500" /> Rapid Entry
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenTool('voice', ass.id)}>
                                    <Mic className="mr-2 h-4 w-4 text-blue-500" /> Voice Entry
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => { deleteAssessment(ass.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {handleBulkColumnUpdate && (
                            <>
                                <DropdownMenuItem onClick={() => { 
                                    if (confirm(`Fill all empty cells in "${ass.title}" with 0?`)) {
                                        const val = prompt("Enter value to set for ALL learners (or leave blank to cancel):", "0");
                                        if (val !== null) handleBulkColumnUpdate(ass.id, val);
                                    }
                                }}>
                                    <PaintBucket className="mr-2 h-4 w-4" /> Fill All
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    if (confirm(`Clear ALL marks for "${ass.title}"?`)) {
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
              <TableHead className="text-center font-bold bg-muted/30 min-w-[100px]">
                <div 
                    className="flex flex-col items-center justify-center cursor-pointer select-none"
                    onClick={() => onSort && onSort('total')}
                >
                    <div className="flex items-center">
                        Total {getSortIcon('total')}
                    </div>
                    {isUsingVisibleTotal && <span className="text-[10px] font-normal text-muted-foreground">(Visible)</span>}
                    <span className="text-xs font-normal">%</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLearners.map((learner, rowIdx) => {
              const total = learner.id ? parseFloat(calculateLearnerTotal(learner.id)) : 0;
              const isAtRisk = total < atRiskThreshold && total > 0;

              return (
                <TableRow key={learner.id || learner.name}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-sm">
                    <div className="flex items-center justify-between">
                      <button 
                        className="hover:underline flex items-center gap-2 text-left"
                        onClick={() => onViewLearnerProfile && onViewLearnerProfile(learner)}
                      >
                        {learner.name}
                      </button>
                      {isAtRisk && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>At Risk: Term Total below {atRiskThreshold}%</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  {visibleAssessments.map((ass, colIdx) => {
                    const comment = learner.id ? getMarkComment(ass.id, learner.id) : "";
                    const markValue = getMarkValue(ass.id, learner.id || '');
                    
                    return (
                      <TableCell key={ass.id} className="p-1">
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div className="flex justify-center relative group">
                              <Input
                                id={`cell-${colIdx}-${rowIdx}`}
                                className={`h-8 w-16 text-center ${isLocked ? "bg-muted cursor-not-allowed" : ""} ${comment ? "border-blue-400 border-dashed" : ""}`}
                                value={markValue}
                                onChange={(e) => learner.id && handleMarkChange(ass.id, learner.id, e.target.value)}
                                onBlur={(e) => learner.id && handleInputBlur(ass.id, learner.id, e.target.value)}
                                onKeyDown={(e) => handleGridKeyDown(e, colIdx, rowIdx)}
                                disabled={!learner.id || !!isLocked}
                                placeholder="-"
                              />
                              {comment && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="absolute top-0 right-1 w-2 h-2 bg-blue-500 rounded-full" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{comment}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem 
                              onClick={() => learner.id && openNoteDialog(ass.id, learner.id, learner.name)}
                              disabled={!learner.id || !!isLocked}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" /> 
                              {comment ? "Edit Note" : "Add Note"}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem 
                              onClick={() => learner.id && handleMarkChange(ass.id, learner.id, "")}
                              disabled={!learner.id || !!isLocked}
                            >
                              Clear Mark
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </TableCell>
                    );
                  })}
                  <TableCell className={`text-center font-bold bg-muted/30 ${isAtRisk ? 'text-red-600' : ''}`}>
                    {learner.id ? total.toFixed(1) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}

            <TableRow className="bg-muted/50 border-t-2 border-muted">
              <TableCell className="font-bold sticky left-0 bg-muted/95 z-10 border-r text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Class Stats
                </div>
              </TableCell>
              {visibleAssessments.map(ass => {
                const stats = getAssessmentStats(ass.id);
                return (
                  <TableCell key={ass.id} className="text-center p-2">
                    <div className="flex flex-col text-xs space-y-1 cursor-pointer hover:bg-muted/80 rounded" onClick={() => openAnalytics(ass)}>
                      <div className="font-semibold text-foreground">Avg: {stats.avg}</div>
                      <div className="flex justify-center gap-2 text-muted-foreground text-[10px]">
                        <span className="flex items-center text-green-600" title="Highest">
                          <ArrowUp className="h-2 w-2 mr-0.5" />{stats.max}
                        </span>
                        <span className="flex items-center text-red-600" title="Lowest">
                          <ArrowDown className="h-2 w-2 mr-0.5" />{stats.min}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="bg-muted/30"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note for {noteDialog.learnerName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Note / Comment</Label>
            <Input 
              value={noteDialog.comment} 
              onChange={(e) => setNoteDialog(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="e.g. Absent, Late, Medical Cert..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={saveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};