import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Lock, Unlock, Plus, AlertCircle, Loader2, Archive, Play, Trash2, ArrowRightCircle } from "lucide-react";
import { useAcademic } from '@/context/AcademicContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTermValidation, ValidationError } from '@/hooks/useTermValidation';
import { TermClosureDialog } from '@/components/dialogs/TermClosureDialog';
import { RollForwardDialog } from '@/components/dialogs/RollForwardDialog';
import { showError, showSuccess } from '@/utils/toast';

export const AcademicYearSettings = () => {
  const { years, terms, activeYear, setActiveYear, createYear, deleteYear, updateTerm, toggleTermStatus, closeYear, rollForwardClasses } = useAcademic();
  const [newYearName, setNewYearName] = useState("");
  
  const { validateTerm, validating } = useTermValidation();
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isValidToClose, setIsValidToClose] = useState(false);

  const [rollForwardOpen, setRollForwardOpen] = useState(false);
  const [rollForwardSourceId, setRollForwardSourceId] = useState<string | null>(null);

  const handleCreateYear = async () => {
    if (newYearName.trim()) {
      await createYear(newYearName.trim());
      setNewYearName("");
    }
  };

  const handleDeleteYear = async () => {
    if (!activeYear) return;
    if (confirm(`Delete "${activeYear.name}"? This is only possible if empty.`)) {
      await deleteYear(activeYear.id);
    }
  };

  const handleTermAction = async (termId: string, currentFinalised: boolean) => {
    if (currentFinalised) {
        if (activeYear?.closed) { showError("Year is finalized."); return; }
        // Rule: Only the last finalised term can be re-opened to maintain sequence
        const termList = [...terms].sort((a,b) => a.name.localeCompare(b.name));
        const idx = termList.findIndex(t => t.id === termId);
        const hasSubsequentFinalised = termList.slice(idx + 1).some(t => t.is_finalised);
        
        if (hasSubsequentFinalised) {
            showError("Progression Rule: Cannot re-open this term while a subsequent term is finalised.");
            return;
        }

        await toggleTermStatus(termId, false);
    } else {
        setSelectedTermId(termId);
        const { isValid, errors } = await validateTerm(termId);
        setIsValidToClose(isValid);
        setValidationErrors(errors);
        setValidationDialogOpen(true);
    }
  };

  const confirmClosure = async () => {
      if (selectedTermId) {
          await toggleTermStatus(selectedTermId, true);
          setValidationDialogOpen(false);
      }
  };

  const initiateRollForward = (sourceId: string) => {
      const nextOpenTerm = terms.find(t => !t.is_finalised);
      if (!nextOpenTerm) {
          showError("No open term found to receive data. Activate the next term first.");
          return;
      }
      setRollForwardSourceId(sourceId);
      setRollForwardOpen(true);
  };

  const handleConfirmRollForward = async (preparedClasses: any[]) => {
      const nextOpenTerm = terms.find(t => !t.is_finalised);
      if (rollForwardSourceId && nextOpenTerm) {
          await rollForwardClasses(rollForwardSourceId, nextOpenTerm.id, preparedClasses);
      }
  };

  const totalWeight = useMemo(() => terms.reduce((acc, t) => acc + Number(t.weight), 0), [terms]);
  const isWeightValid = totalWeight === 100;
  const allTermsClosed = terms.length > 0 && terms.every(t => t.is_finalised);

  const nextOpenTerm = terms.find(t => !t.is_finalised);

  return (
    <div className="grid gap-6 md:grid-cols-1">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Academic Configuration</CardTitle>
                <CardDescription>Finalise a term to lock data and enable Roll Forward migration.</CardDescription>
            </div>
            <div className="flex gap-2">
                {activeYear && !activeYear.closed && (
                    <>
                        <Button variant="ghost" size="sm" onClick={handleDeleteYear} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Cycle
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { if(allTermsClosed && isWeightValid) closeYear(activeYear.id); }} disabled={!allTermsClosed || !isWeightValid}>
                            <Archive className="mr-2 h-4 w-4" /> Finalize Year
                        </Button>
                    </>
                )}
                {activeYear?.closed && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 px-3 py-1"><Lock className="h-3 w-3 mr-2" /> Year Finalized</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Working Year</label>
                <Select value={activeYear?.id} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                    <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name} {y.closed ? "(Finalized)" : ""}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div className="space-y-1.5 ml-auto">
                 <label className="text-[10px] uppercase font-bold text-muted-foreground">New Cycle</label>
                 <div className="flex gap-2">
                    <Input placeholder="e.g. 2026" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} className="w-[120px]" />
                    <Button onClick={handleCreateYear} variant="secondary"><Plus className="mr-2 h-4 w-4" /> Create</Button>
                 </div>
             </div>
          </div>
          
          {activeYear && (
             <div className="border rounded-lg mt-6 overflow-hidden bg-white dark:bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Term / Period</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="text-right font-bold">Migration Gate</TableHead>
                            <TableHead className="text-right font-bold">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {terms.sort((a,b) => a.name.localeCompare(b.name)).map((term, idx, arr) => {
                            const isPrevFinalised = idx === 0 || arr[idx-1].is_finalised;
                            return (
                                <TableRow key={term.id} className={cn("hover:bg-muted/10", !term.is_finalised && "bg-primary/[0.02]")}>
                                    <TableCell className="font-bold">{term.name}</TableCell>
                                    <TableCell>
                                        {term.is_finalised ? <Badge variant="secondary">Finalised (Locked)</Badge> : <Badge variant="outline" className="bg-green-50 text-green-700">Open (Working)</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {term.is_finalised && terms.some(t => !t.is_finalised) ? (
                                            <Button variant="outline" size="sm" onClick={() => initiateRollForward(term.id)} className="h-8 gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                <ArrowRightCircle className="h-3 w-3" />
                                                Roll Forward Roster
                                            </Button>
                                        ) : !term.is_finalised ? (
                                            <span className="text-[10px] text-muted-foreground italic">Finalise term to unlock migration.</span>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant={term.is_finalised ? "ghost" : "outline"} 
                                            size="sm" 
                                            disabled={validating || !!activeYear.closed || (!isPrevFinalised && !term.is_finalised)} 
                                            onClick={() => handleTermAction(term.id, term.is_finalised)} 
                                            className="h-8"
                                        >
                                            {validating && selectedTermId === term.id ? <Loader2 className="h-4 w-4 animate-spin" /> : term.is_finalised ? <><Unlock className="h-4 w-4 mr-1 opacity-50" /> Re-open</> : <><Lock className="h-4 w-4 mr-1 opacity-50" /> Finalise</>}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
             </div>
          )}
        </CardContent>
      </Card>
      
      <TermClosureDialog 
        open={validationDialogOpen} 
        onOpenChange={setValidationDialogOpen} 
        termName={terms.find(t => t.id === selectedTermId)?.name || "Term"} 
        errors={validationErrors} 
        isValid={isValidToClose} 
        onConfirm={confirmClosure} 
      />

      {rollForwardSourceId && nextOpenTerm && (
          <RollForwardDialog
            open={rollForwardOpen}
            onOpenChange={setRollForwardOpen}
            sourceTermId={rollForwardSourceId}
            sourceTermName={terms.find(t => t.id === rollForwardSourceId)?.name || ""}
            targetTermId={nextOpenTerm.id}
            targetTermName={nextOpenTerm.name}
            onConfirm={handleConfirmRollForward}
          />
      )}
    </div>
  );
};