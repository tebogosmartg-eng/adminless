import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Calendar, Eye, AlertCircle, Search, Settings2, FileSpreadsheet, Plus, Copy, Upload, Loader2, CheckCircle2, Layers, Info, BarChart3 } from 'lucide-react';
import { Assessment, Term, AcademicYear, Rubric, ClassInfo } from '@/lib/types';
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DiagnosticReportDialog } from "./DiagnosticReportDialog";

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
  handleSaveMarks: () => void;
  handleExportSheet: () => void;
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
  searchQuery, setSearchQuery, editedMarksCount, handleExportSheet,
  isAddOpen, setIsAddOpen, setIsImportOpen, setIsCopyOpen,
  newAss, setNewAss, handleAddAssessment,
  assessments, visibleAssessmentIds, toggleAssessmentVisibility, recalculateTotal, setRecalculateTotal,
  isAutoSaving, availableRubrics = [],
  classInfo
}: MarkSheetToolbarProps) => {

  const [diagOpen, setDiagOpen] = useState(false);

  const handleRubricSelect = (val: string) => {
      const rubric = availableRubrics.find(r => r.id === val);
      setNewAss({ 
          ...newAss, 
          rubricId: val,
          max: rubric ? rubric.total_points : newAss.max 
      });
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none" title="Export Reports">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> 
                    <span className="hidden sm:inline">Export</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={handleExportSheet}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export Marksheet (CSV)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDiagOpen(true)} className="font-bold py-2.5">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Generate Diagnostic Report
                </DropdownMenuItem>
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
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>New Formal Assessment Task (FAT)</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                 <Calendar className="h-3 w-3" /> Target Term: <span className="font-bold text-foreground">{targetTermName}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-[11px] text-blue-900 leading-tight">
                      This formal assessment will be locked to <strong>{targetTermName}</strong>. Ensure weighting aligns with DBE policy.
                  </p>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Task Title</Label>
                <Input value={newAss.title} onChange={e => setNewAss({ ...newAss, title: e.target.value })} className="col-span-3 h-9" placeholder="e.g. Investigation 1" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Rubric (Opt)</Label>
                <Select value={newAss.rubricId} onValueChange={handleRubricSelect}>
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
                    disabled={!!newAss.rubricId && newAss.rubricId !== 'none'}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Weighting %</Label>
                <Input type="number" value={newAss.weight} onChange={e => setNewAss({ ...newAss, weight: parseFloat(e.target.value) })} className="col-span-3 h-9" />
              </div>
              <Button onClick={handleAddAssessment} className="mt-2 w-full font-bold">Record Assessment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classInfo && currentViewTerm && activeYear && (
          <DiagnosticReportDialog 
            open={diagOpen}
            onOpenChange={setDiagOpen}
            classInfo={classInfo}
            term={currentViewTerm}
            year={activeYear}
          />
      )}
    </div>
  );
};