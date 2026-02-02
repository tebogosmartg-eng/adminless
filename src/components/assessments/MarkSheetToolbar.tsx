import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Calendar, Eye, AlertCircle, Search, Settings2, FileSpreadsheet, Plus, Copy, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Assessment, Term, AcademicYear } from '@/lib/types';
import { cn } from "@/lib/utils";

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
}

export const MarkSheetToolbar = ({
  terms, activeTerm, activeYear, viewTermId, setViewTermId, currentViewTerm,
  isWeightValid, currentTotalWeight, isLocked,
  searchQuery, setSearchQuery, editedMarksCount, handleExportSheet,
  isAddOpen, setIsAddOpen, setIsImportOpen, setIsCopyOpen,
  newAss, setNewAss, handleAddAssessment,
  assessments, visibleAssessmentIds, toggleAssessmentVisibility, recalculateTotal, setRecalculateTotal,
  isAutoSaving
}: MarkSheetToolbarProps) => {

  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={viewTermId || ""} onValueChange={setViewTermId}>
            <SelectTrigger className="w-[180px] h-9">
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
          
          {/* Tired Teacher UX: Status indicators instead of required clicks */}
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

      <div className="flex flex-1 flex-wrap justify-end gap-2 w-full xl:w-auto">
        <div className="relative w-full md:w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find learner..."
            className="pl-8 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Settings2 className="mr-2 h-4 w-4" /> View
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

        <Button variant="outline" size="sm" className="h-9" onClick={handleExportSheet} title="Export to CSV">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
        </Button>

        {!isLocked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 bg-primary shadow-sm">
                <Plus className="mr-1 h-4 w-4" /> Task
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Assessment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCopyOpen(true)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Structure
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Assessment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Title</Label>
                <Input value={newAss.title} onChange={e => setNewAss({ ...newAss, title: e.target.value })} className="col-span-3 h-9" placeholder="e.g. Test 1" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Max Mark</Label>
                <Input type="number" value={newAss.max} onChange={e => setNewAss({ ...newAss, max: parseInt(e.target.value) })} className="col-span-3 h-9" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Weight (%)</Label>
                <Input type="number" value={newAss.weight} onChange={e => setNewAss({ ...newAss, weight: parseFloat(e.target.value) })} className="col-span-3 h-9" />
              </div>
              <Button onClick={handleAddAssessment} className="mt-2">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};