import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Calendar, Eye, AlertCircle, Search, Settings2, Save, FileSpreadsheet, Plus, Copy, Upload } from 'lucide-react';
import { Assessment, Term, AcademicYear } from '@/lib/types';

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
}

export const MarkSheetToolbar = ({
  terms, activeTerm, activeYear, viewTermId, setViewTermId, currentViewTerm,
  isWeightValid, currentTotalWeight, isLocked,
  searchQuery, setSearchQuery, editedMarksCount, handleSaveMarks, handleExportSheet,
  isAddOpen, setIsAddOpen, setIsImportOpen, setIsCopyOpen,
  newAss, setNewAss, handleAddAssessment,
  assessments, visibleAssessmentIds, toggleAssessmentVisibility, recalculateTotal, setRecalculateTotal
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
          {activeYear?.closed && <Badge variant="destructive">Year Finalized</Badge>}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={isWeightValid ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
            Total Weighting: {currentTotalWeight}%
          </span>
          {!isWeightValid && (
            <Tooltip>
              <TooltipTrigger><AlertCircle className="h-4 w-4 text-amber-500" /></TooltipTrigger>
              <TooltipContent>
                {recalculateTotal
                  ? "Displayed total represents only visible columns."
                  : "Weights must sum to 100% for correct final calculation."}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap justify-end gap-2 w-full xl:w-auto">
        <div className="relative w-full md:w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search learner..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Settings2 className="mr-2 h-4 w-4" /> View Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Visible Assessments</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {assessments.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">No assessments available.</div>
            ) : (
                assessments.map(ass => (
                <DropdownMenuCheckboxItem
                    key={ass.id}
                    checked={visibleAssessmentIds.includes(ass.id)}
                    onCheckedChange={() => toggleAssessmentVisibility(ass.id)}
                >
                    {ass.title}
                </DropdownMenuCheckboxItem>
                ))
            )}
            <DropdownMenuSeparator />
            <div className="p-2 flex items-center justify-between">
              <Label htmlFor="recalc-toggle" className="text-xs">Calc. Visible Only</Label>
              <Switch
                id="recalc-toggle"
                checked={recalculateTotal}
                onCheckedChange={setRecalculateTotal}
                className="scale-75"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleSaveMarks} disabled={editedMarksCount === 0 || !!isLocked}>
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>

        <Button variant="outline" size="icon" onClick={handleExportSheet} title="Export to CSV">
          <FileSpreadsheet className="h-4 w-4" />
        </Button>

        {!isLocked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add / Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Assessment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCopyOpen(true)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Structure...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import Marks CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Assessment ({currentViewTerm?.name})</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Title</Label>
                <Input value={newAss.title} onChange={e => setNewAss({ ...newAss, title: e.target.value })} className="col-span-3" placeholder="e.g. Algebra Test" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <Select value={newAss.type} onValueChange={v => setNewAss({ ...newAss, type: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Test">Test</SelectItem>
                    <SelectItem value="Exam">Exam</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Max Mark</Label>
                <Input type="number" value={newAss.max} onChange={e => setNewAss({ ...newAss, max: parseInt(e.target.value) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Weight (%)</Label>
                <Input type="number" value={newAss.weight} onChange={e => setNewAss({ ...newAss, weight: parseFloat(e.target.value) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Input type="date" value={newAss.date} onChange={e => setNewAss({ ...newAss, date: e.target.value })} className="col-span-3" />
              </div>
              <Button onClick={handleAddAssessment}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};