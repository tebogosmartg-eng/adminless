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
  BarChart2, MoreHorizontal, Trash2, TrendingUp, ArrowUp, ArrowDown, AlertCircle, MessageSquare, PaintBucket, Eraser, ArrowUpDown, Zap, Mic, Layers, Settings2, CheckSquare, ListChecks, BarChart3, Grid3X3, AlertTriangle, SlidersHorizontal, GripVertical, Loader2, Check
} from 'lucide-react';
import { Assessment, Learner } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import type { CSSProperties, Key } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { parseMarkInput } from "@/utils/marks";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { sortAssessmentsDeterministically } from "@/utils/assessmentOrdering";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Below this learner count, render all rows (natural page scroll). Above, vertical virtual scroll inside the grid. */
const MARK_SHEET_VIRTUAL_ROW_THRESHOLD = 36;
const MARK_SHEET_ROW_ESTIMATE_PX = 48;

interface MarkSheetTableProps {
  assessments: Assessment[]; 
  visibleAssessments: Assessment[];
  classId: string;
  termId: string;
  filteredLearners: Learner[];
  currentViewTermName: string | undefined;
  isLocked: boolean | undefined;
  isReorderingAssessments?: boolean;
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
  handleBulkColumnUpdate?: (assId: string, val: string) => Promise<{ success: boolean; message?: string } | void>;
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
  onReorderAssessments?: (payload: { id: string; position: number }[], termId: string) => Promise<void>;
  onUndoLastReorder?: (termId: string) => Promise<void>;
  cellSaveStatus?: Record<string, 'saving' | 'saved' | 'error'>;
}

interface SortableAssessmentHeaderProps {
  assessmentId: string;
  disabled: boolean;
  children: React.ReactNode;
}

const SortableAssessmentHeader = ({ assessmentId, disabled, children }: SortableAssessmentHeaderProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: assessmentId,
    disabled,
  });

  const dragTransform = transform
    ? { ...transform, scaleX: isDragging ? 1.02 : 1, scaleY: isDragging ? 1.02 : 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(dragTransform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        "text-center min-w-[120px] border-r border-border transition-[box-shadow,background-color,transform] duration-200 ease-out",
        !disabled && "bg-primary/[0.03] shadow-[inset_0_-1px_0_rgba(59,130,246,0.15)]",
        isDragging && "shadow-lg bg-background"
      )}
    >
      <div className={cn("flex items-start gap-1", !disabled && "cursor-grab active:cursor-grabbing")}>
        {!disabled && (
          <button
            type="button"
            className="mt-1 rounded-sm text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="Drag to reorder assessment"
            title="Drag to reorder column"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </TableHead>
  );
};

export const MarkSheetTable = ({
  assessments, visibleAssessments, classId, termId, filteredLearners, currentViewTermName,
  isLocked, isReorderingAssessments = false, isUsingVisibleTotal, atRiskThreshold, sortConfig, setIsAddOpen,
  openAnalytics, onOpenDiagnostic, onOpenQuestionGrid, deleteAssessment, onEditAssessment, getMarkValue, getMarkComment, handleMarkChange, handleCommentChange, handleBulkColumnUpdate,
  calculateLearnerTotal, getAssessmentStats, onViewLearnerProfile, onSort, onOpenTool, onOpenRubric, onOpenQuestions,
  validateAndCommitMark, onApplyModeration, onReorderAssessments, onUndoLastReorder, cellSaveStatus = {}
}: MarkSheetTableProps) => {

  const [noteDialog, setNoteDialog] = useState<{ open: boolean; assId: string; learnerId: string; learnerName: string; comment: string }>({ 
    open: false, assId: '', learnerId: '', learnerName: '', comment: '' 
  });
  const [bulkConfirm, setBulkConfirm] = useState<{ assId: string; value: string; label: string } | null>(null);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationAssId, setModerationAssId] = useState<string | null>(null);
  const [moderationPct, setModerationPct] = useState("");
  
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedVisibleAssessments, setOrderedVisibleAssessments] = useState<Assessment[]>(() =>
    sortAssessmentsDeterministically(visibleAssessments)
  );
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasJustSavedOrder, setHasJustSavedOrder] = useState(false);
  const [canUndoReorder, setCanUndoReorder] = useState(false);
  const [hasJustUndoneOrder, setHasJustUndoneOrder] = useState(false);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualizeRows =
    filteredLearners.length >= MARK_SHEET_VIRTUAL_ROW_THRESHOLD && !reorderMode;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualizeRows ? filteredLearners.length : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => MARK_SHEET_ROW_ESTIMATE_PX,
    overscan: 12,
  });

  const highRiskCells = useMemo(() => {
    const riskSet = new Set<string>();
    if (!assessments || assessments.length === 0) return riskSet;

    const sortedAss = sortAssessmentsDeterministically(assessments);

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

            if (runningCount > 0) {
              const prevAvg = runningSum / runningCount;
              if (percentage < atRiskThreshold && percentage <= prevAvg - 5) {
                riskSet.add(`${ass.id}-${learner.id}`);
              }
            }

            runningSum += percentage;
            runningCount++;
          }
        }
      });
    });

    return riskSet;
  }, [assessments, filteredLearners, getMarkValue, atRiskThreshold]);

  useEffect(() => {
    const nextSortedVisible = sortAssessmentsDeterministically(visibleAssessments);
    const nextIds = nextSortedVisible.map((assessment) => assessment.id).join("|");
    setOrderedVisibleAssessments((prev) => {
      const prevIds = prev.map((assessment) => assessment.id).join("|");
      if (prevIds === nextIds) return prev;
      return nextSortedVisible;
    });
  }, [visibleAssessments]);

  useEffect(() => {
    if (!hasJustSavedOrder) return;
    const timeout = window.setTimeout(() => setHasJustSavedOrder(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [hasJustSavedOrder]);

  useEffect(() => {
    if (!hasJustUndoneOrder) return;
    const timeout = window.setTimeout(() => setHasJustUndoneOrder(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [hasJustUndoneOrder]);

  const mergedOrderedAssessments = (reorderedVisible: Assessment[]) => {
    const scopedAssessments = sortAssessmentsDeterministically(
      assessments.filter((assessment) => assessment.class_id === classId && assessment.term_id === termId)
    );
    const visibleIdSet = new Set(reorderedVisible.map((assessment) => assessment.id));
    const reorderedById = new Map(reorderedVisible.map((assessment) => [assessment.id, assessment]));
    const untouchedVisible = scopedAssessments.filter((assessment) => visibleIdSet.has(assessment.id));

    if (untouchedVisible.length !== reorderedVisible.length) {
      return scopedAssessments;
    }

    let cursor = 0;
    return scopedAssessments.map((assessment) => {
      if (!visibleIdSet.has(assessment.id)) return assessment;
      const nextAssessment = reorderedVisible[cursor];
      cursor += 1;
      return reorderedById.get(nextAssessment.id) || nextAssessment;
    });
  };

  const handleAssessmentDragEnd = async (event: DragEndEvent) => {
    if (!reorderMode || isSavingOrder || isReorderingAssessments || !onReorderAssessments) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previousOrder = orderedVisibleAssessments;
    const oldIndex = previousOrder.findIndex((assessment) => assessment.id === active.id);
    const newIndex = previousOrder.findIndex((assessment) => assessment.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextVisibleOrder = arrayMove(previousOrder, oldIndex, newIndex);
    setOrderedVisibleAssessments(nextVisibleOrder);

    const fullOrdered = mergedOrderedAssessments(nextVisibleOrder);
    const payload = fullOrdered.map((assessment, index) => ({
      id: assessment.id,
      position: index + 1,
    }));

    setIsSavingOrder(true);
    setHasJustSavedOrder(false);
    try {
      await onReorderAssessments(payload, termId);
      setCanUndoReorder(true);
      setHasJustSavedOrder(true);
      setHasJustUndoneOrder(false);
      showSuccess("Assessment order saved.");
    } catch (error) {
      console.error("Failed to reorder assessments:", error);
      setOrderedVisibleAssessments(previousOrder);
      showError("Could not save order. Restored previous arrangement.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleUndoReorder = async () => {
    if (!onUndoLastReorder || isSavingOrder || isReorderingAssessments || !canUndoReorder) return;

    setIsSavingOrder(true);
    setHasJustSavedOrder(false);
    setHasJustUndoneOrder(false);
    try {
      await onUndoLastReorder(termId);
      setCanUndoReorder(false);
      setHasJustUndoneOrder(true);
      showSuccess("Reverted ✓");
    } catch (error) {
      console.error("Failed to undo reorder:", error);
      showError("Could not undo reorder. Previous arrangement restored.");
    } finally {
      setIsSavingOrder(false);
    }
  };

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
    if (isLocked) return;
    handleCommentChange(noteDialog.assId, noteDialog.learnerId, noteDialog.comment);
    setNoteDialog(prev => ({ ...prev, open: false }));
  };

  const handleInputBlur = (assId: string, learnerId: string, currentValue: string) => {
    if (validateAndCommitMark) {
        validateAndCommitMark(assId, learnerId, currentValue);
    }
  };

  const requestBulkUpdate = (assId: string, value: string, label: string) => {
    setBulkConfirm({ assId, value, label });
  };

  const executeBulkUpdate = async () => {
    if (!bulkConfirm || !handleBulkColumnUpdate) return;
    const { assId, value, label } = bulkConfirm;
    setBulkConfirm(null);
    const result = await handleBulkColumnUpdate(assId, value);
    if (result && result.success === false) return;
    showSuccess(`Column updated to ${label}.`);
  };

  const openModerationDialog = (assId: string) => {
    setModerationAssId(assId);
    setModerationPct("");
    setModerationOpen(true);
  };

  const applyModerationFromDialog = () => {
    if (!moderationAssId || !onApplyModeration) return;
    const num = parseFloat(moderationPct.trim());
    if (Number.isNaN(num)) {
      showError("Invalid adjustment value.");
      return;
    }
    onApplyModeration(moderationAssId, num);
    setModerationOpen(false);
    setModerationAssId(null);
    setModerationPct("");
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
        if (e.key === 'ArrowRight') nextCol = Math.min(orderedVisibleAssessments.length - 1, colIdx + 1);

        const nextEl = document.getElementById(`cell-${nextCol}-${nextRow}`);
        if (nextEl) {
            (nextEl as HTMLInputElement).focus();
            setTimeout(() => (nextEl as HTMLInputElement).select(), 0);
        }
    }
  };

  const assessmentStatsById = useMemo(() => {
    const map = new Map<string, { avg: string; max: string | number; min: string | number }>();
    orderedVisibleAssessments.forEach((ass) => {
      map.set(ass.id, getAssessmentStats(ass.id));
    });
    return map;
  }, [orderedVisibleAssessments, getAssessmentStats]);

  const learnerColumnSpan = 2 + orderedVisibleAssessments.length;

  const renderLearnerRow = (learner: Learner, rowIdx: number, reactKey: Key) => {
    const total = learner.id ? parseFloat(calculateLearnerTotal(learner.id)) : 0;
    const isAtRisk = total < atRiskThreshold && total > 0;
    const isRowFocused = activeRow === rowIdx;

    return (
      <TableRow
        key={reactKey}
        className={cn(
          "group transition-all h-[48px] md:h-10 border-border",
          isRowFocused ? "bg-primary/5 shadow-inner" : "hover:bg-muted/30",
        )}
      >
        <TableCell
          className={cn(
            "font-medium sticky left-0 z-10 border-r border-border shadow-sm transition-colors",
            isRowFocused ? "bg-primary/10" : "bg-background dark:bg-card",
          )}
        >
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              className="hover:underline text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[160px] text-left text-foreground"
              onClick={() => onViewLearnerProfile && onViewLearnerProfile(learner)}
            >
              {learner.name}
            </button>
            {isAtRisk && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          </div>
        </TableCell>
        {orderedVisibleAssessments.map((ass, colIdx) => {
          const comment = learner.id ? getMarkComment(ass.id, learner.id) : "";
          const markValue = getMarkValue(ass.id, learner.id || "");
          const hasQuestions = ass.questions && ass.questions.length > 0;
          const isHighRiskCell = learner.id ? highRiskCells.has(`${ass.id}-${learner.id}`) : false;
          const cellKey = learner.id ? `${ass.id}::${learner.id}` : "";
          const saveState = cellKey ? cellSaveStatus[cellKey] : undefined;
          const isCellSaving = saveState === "saving";
          const isCellSaved = saveState === "saved";
          const isCellError = saveState === "error";

          return (
            <TableCell key={ass.id} className="p-0 border-r border-border last:border-r-0 relative min-w-[60px]">
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className="flex items-center justify-center h-[48px] md:h-10 w-full relative group/cell">
                    <input
                      id={`cell-${colIdx}-${rowIdx}`}
                      inputMode="decimal"
                      pattern="[0-9]*"
                      className={cn(
                        "h-full w-full bg-transparent text-center text-sm outline-none transition-all",
                        "border border-transparent hover:border-muted-foreground/20 text-foreground",
                        "focus:bg-background focus:ring-2 focus:ring-primary focus:z-10",
                        isLocked && "bg-muted/50 cursor-not-allowed text-muted-foreground",
                        comment && "font-bold text-primary",
                        hasQuestions && "border-blue-200/30 dark:border-blue-800/30",
                        isHighRiskCell && "text-red-600 font-bold bg-red-50/20 dark:bg-red-950/20",
                        isCellSaving && "bg-primary/10",
                        isCellSaved && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                        isCellError && "bg-destructive/10 ring-1 ring-destructive/30",
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

                    {isCellSaving && (
                      <div className="absolute right-1.5 top-1.5 pointer-events-none">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {isCellSaved && (
                      <div className="absolute right-1.5 top-1.5 pointer-events-none text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

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

                    {!isLocked && (ass.rubric_id || hasQuestions) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 absolute right-0.5 sm:hidden inline-flex hover:bg-muted/80"
                            title="Open actions"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {ass.rubric_id && (
                            <DropdownMenuItem onClick={() => onOpenRubric && onOpenRubric(ass.id, learner)}>
                              <Layers className="mr-2 h-4 w-4" /> Mark with Rubric
                            </DropdownMenuItem>
                          )}
                          {hasQuestions && (
                            <DropdownMenuItem onClick={() => onOpenQuestions && onOpenQuestions(ass.id, learner)}>
                              <ListChecks className="mr-2 h-4 w-4" /> Question-Level marking
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  <ContextMenuItem
                    disabled={!!isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      learner.id && openNoteDialog(ass.id, learner.id, learner.name);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Observation
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </TableCell>
          );
        })}
        <TableCell
          className={cn(
            "text-center font-bold text-sm transition-colors",
            isAtRisk ? "text-amber-600 bg-amber-50 dark:bg-amber-900/10" : "text-primary bg-primary/5",
          )}
        >
          {learner.id ? total.toFixed(1) : "-"}
        </TableCell>
      </TableRow>
    );
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

  const virtualItems = shouldVirtualizeRows ? rowVirtualizer.getVirtualItems() : [];
  const virtualPadTop =
    shouldVirtualizeRows && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const virtualPadBottom =
    shouldVirtualizeRows && virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <>
      <div className="border border-border bg-card rounded-md overflow-hidden shadow-sm w-full max-w-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={reorderMode ? "default" : "outline"}
              aria-pressed={reorderMode}
              aria-label={reorderMode ? "Done reordering columns" : "Enable column reordering"}
              onClick={() => setReorderMode((prev) => !prev)}
              disabled={!!isLocked || isSavingOrder || isReorderingAssessments}
            >
              {reorderMode ? "Done Reordering" : "Reorder Columns"}
            </Button>
            {canUndoReorder && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUndoReorder}
                disabled={!!isLocked || isSavingOrder || isReorderingAssessments}
              >
                Undo Reorder
              </Button>
            )}
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {(isSavingOrder || isReorderingAssessments) && (
              <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
              </>
            )}
            {!isSavingOrder && !isReorderingAssessments && hasJustSavedOrder && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Saved ✓</span>
            )}
            {!isSavingOrder && !isReorderingAssessments && hasJustUndoneOrder && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Reverted ✓</span>
            )}
          </div>
        </div>
        {reorderMode && (
          <div className="mx-3 mt-3 mb-1 rounded-md border border-primary/20 bg-primary/[0.06] px-3 py-2 text-sm text-primary">
            Reorder mode active - drag column headers to rearrange
          </div>
        )}
        <div
          ref={scrollParentRef}
          className={cn(
            "overflow-x-auto w-full no-scrollbar pb-2 transition-colors",
            shouldVirtualizeRows && "max-h-[min(72vh,720px)] overflow-y-auto",
            reorderMode && "bg-primary/[0.02]",
          )}
        >
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleAssessmentDragEnd}>
            <Table className="border-collapse table-fixed w-full min-w-[800px]">
            <TableHeader
              className={cn(
                shouldVirtualizeRows && "sticky top-0 z-30 bg-card shadow-[0_1px_0_hsl(var(--border))]",
              )}
            >
                <TableRow className="hover:bg-transparent border-b border-border h-12">
                <TableHead className="w-[160px] sm:w-[220px] sticky left-0 bg-muted/90 dark:bg-muted/50 z-20 border-r border-border backdrop-blur-sm">
                    <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none"
                        onClick={() => onSort && onSort('name')}
                    >
                    Learner Name
                    {getSortIcon('name')}
                    </div>
                </TableHead>
                <SortableContext items={orderedVisibleAssessments.map((ass) => ass.id)} strategy={horizontalListSortingStrategy}>
                {orderedVisibleAssessments.map(ass => (
                    <SortableAssessmentHeader
                      key={ass.id}
                      assessmentId={ass.id}
                      disabled={!reorderMode || !!isLocked || isSavingOrder || isReorderingAssessments}
                    >
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
                            <DropdownMenuItem onClick={() => requestBulkUpdate(ass.id, ass.max_mark.toString(), 'Max Marks')}>
                                <CheckSquare className="mr-2 h-4 w-4 text-green-600" /> Fill Max Marks
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModerationDialog(ass.id)}>
                                <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" /> Apply Moderation (%)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => requestBulkUpdate(ass.id, "", 'Empty')}>
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
                    </SortableAssessmentHeader>
                ))}
                </SortableContext>
                <TableHead className="text-center font-bold bg-primary/5 dark:bg-primary/10 min-w-[80px]">
                    <div className="flex flex-col items-center justify-center text-[10px] uppercase tracking-widest text-primary">
                        Final Score (Weighted)
                    </div>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {virtualPadTop > 0 && (
                  <TableRow className="border-0 hover:bg-transparent" aria-hidden>
                    <TableCell
                      colSpan={learnerColumnSpan}
                      className="p-0 border-0"
                      style={{ height: virtualPadTop }}
                    />
                  </TableRow>
                )}
                {shouldVirtualizeRows
                  ? virtualItems.map((vi) =>
                      renderLearnerRow(filteredLearners[vi.index], vi.index, vi.key),
                    )
                  : filteredLearners.map((learner, rowIdx) =>
                      renderLearnerRow(learner, rowIdx, learner.id || `row-${rowIdx}`),
                    )}
                {virtualPadBottom > 0 && (
                  <TableRow className="border-0 hover:bg-transparent" aria-hidden>
                    <TableCell
                      colSpan={learnerColumnSpan}
                      className="p-0 border-0"
                      style={{ height: virtualPadBottom }}
                    />
                  </TableRow>
                )}

                <TableRow className="bg-muted/50 border-t-2 border-border h-10">
                <TableCell className="font-bold sticky left-0 bg-muted z-10 border-r border-border text-[9px] uppercase tracking-widest text-muted-foreground px-2">
                    Avg (Assessment)
                </TableCell>
                {orderedVisibleAssessments.map(ass => {
                    const stats = assessmentStatsById.get(ass.id) ?? getAssessmentStats(ass.id);
                    return (
                    <TableCell key={ass.id} className="text-center p-0 border-r border-border last:border-r-0">
                        <div className="font-bold text-[10px] text-foreground">{stats.avg}%</div>
                    </TableCell>
                    );
                })}
                <TableCell className="bg-primary/10 border-border text-center font-bold text-[10px] uppercase tracking-wide text-primary">
                    Final (Weighted)
                </TableCell>
                </TableRow>
            </TableBody>
            </Table>
            </DndContext>
        </div>
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] bg-background text-foreground rounded-lg">
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
                disabled={!!isLocked}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={saveNote} className="w-full sm:w-auto" disabled={!!isLocked}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkConfirm !== null} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update entire column?</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm
                ? `Set all marks in this column to ${bulkConfirm.label}. Existing marks will be overwritten.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" onClick={() => void executeBulkUpdate()}>
              Apply to column
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={moderationOpen} onOpenChange={(open) => {
        setModerationOpen(open);
        if (!open) {
          setModerationAssId(null);
          setModerationPct("");
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Apply moderation adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="moderation-pct" className="text-muted-foreground">
              Adjustment (% points), e.g. 5 or -2
            </Label>
            <Input
              id="moderation-pct"
              inputMode="decimal"
              placeholder="0"
              value={moderationPct}
              onChange={(e) => setModerationPct(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setModerationOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyModerationFromDialog}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};