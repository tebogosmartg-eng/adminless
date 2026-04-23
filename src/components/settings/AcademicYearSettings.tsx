import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Plus, Loader2, Archive, Trash2, ArrowRightCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAcademic } from '@/context/AcademicContext';
import { cn } from "@/lib/utils";
import { useTermValidation, ValidationError } from '@/hooks/useTermValidation';
import { TermClosureDialog } from '@/components/dialogs/TermClosureDialog';
import { RollForwardDialog } from '@/components/dialogs/RollForwardDialog';
import { showError } from '@/utils/toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AcademicYearSettings = () => {
  const { years, terms, activeYear, setActiveYear, createYear, deleteYear, toggleTermStatus, closeYear, rollForwardClasses } = useAcademic();
  const [newYearName, setNewYearName] = useState("");
  
  const { validateTerm, validating } = useTermValidation();
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isValidToClose, setIsValidToClose] = useState(false);

  const [rollForwardOpen, setRollForwardOpen] = useState(false);
  const [rollForwardSourceId, setRollForwardSourceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteYearDialogOpen, setDeleteYearDialogOpen] = useState(false);
  const [closeYearDialogOpen, setCloseYearDialogOpen] = useState(false);

  const handleCreateYear = async () => {
    if (newYearName.trim()) {
      await createYear(newYearName.trim());
      setNewYearName("");
    }
  };

  const handleDeleteYear = async () => {
    if (!activeYear) return;
    await deleteYear(activeYear.id);
    setDeleteYearDialogOpen(false);
    setStatusMessage(`Saved ✓ "${activeYear.name}" deleted.`);
  };

  const handleTermAction = async (termId: string, currentFinalised: boolean) => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (currentFinalised) {
        if (activeYear?.closed) { showError("Year is finalized."); return; }
        
        const termList = [...terms].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        const idx = termList.findIndex(t => t.id === termId);
        const hasSubsequentFinalised = termList.slice(idx + 1).some(t => t.is_finalised);
        
        if (hasSubsequentFinalised) {
            showError("Progression Block: Cannot re-open a term if future terms are already finalised.");
            setErrorMessage("Cannot re-open a term while future terms are already finalised.");
            return;
        }

        await toggleTermStatus(termId, false);
        setStatusMessage("Saved ✓ Term re-opened.");
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
          setStatusMessage("Saved ✓ Term finalised.");
      }
  };

  const initiateRollForward = (sourceId: string) => {
      const nextOpenTerm = terms.find(t => !t.is_finalised);
      if (!nextOpenTerm) {
          showError("No open term found to receive data.");
          setErrorMessage("No open term found to receive roll-forward data.");
          return;
      }
      setRollForwardSourceId(sourceId);
      setRollForwardOpen(true);
  };

  const handleConfirmRollForward = async (preparedClasses: any[]) => {
      const nextOpenTerm = terms.find(t => !t.is_finalised);
      if (rollForwardSourceId && nextOpenTerm) {
          await rollForwardClasses(rollForwardSourceId, nextOpenTerm.id, preparedClasses);
          setStatusMessage(`Saved ✓ Classes rolled into ${nextOpenTerm.name}.`);
      }
  };

  const totalWeight = useMemo(() => terms.reduce((acc, t) => acc + Number(t.weight), 0), [terms]);
  const isWeightValid = totalWeight === 100;
  const allTermsClosed = terms.length > 0 && terms.every(t => t.is_finalised);

  const nextOpenTerm = terms.find(t => !t.is_finalised);

  return (
    <div className="grid gap-6 w-full min-w-0">
      <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full min-w-0">
            <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="truncate">Term Progression Control</CardTitle>
                <CardDescription className="break-words">Strict academic sequence. Finalise your current term to unlock the next period.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
                {activeYear && !activeYear.closed && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteYearDialogOpen(true)} className="flex-1 sm:flex-none text-muted-foreground hover:text-destructive h-10 md:h-9">
                            <Trash2 className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete Cycle</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setCloseYearDialogOpen(true)} disabled={!allTermsClosed || !isWeightValid} className="flex-1 sm:flex-none h-10 md:h-9">
                            <Archive className="mr-2 h-4 w-4" /> Close Year
                        </Button>
                    </>
                )}
                {activeYear?.closed && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 px-3 py-1 w-full md:w-auto justify-center"><Lock className="h-3 w-3 mr-2" /> Year Finalized</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 w-full min-w-0">
          {statusMessage && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
             <div className="space-y-1.5 w-full flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block truncate">Active Academic Cycle</label>
                <Select value={activeYear?.id} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                    <SelectTrigger className="w-full sm:w-[240px] h-10"><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name} {y.closed ? "(Finalized)" : ""}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div className="space-y-1.5 w-full sm:ml-auto shrink-0">
                 <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block truncate">Initialise New Year</label>
                 <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Input placeholder="e.g. 2026" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} className="w-full sm:w-[120px] h-10" />
                    <Button onClick={handleCreateYear} variant="secondary" className="w-full sm:w-auto shrink-0 h-10"><Plus className="mr-2 h-4 w-4" /> Initialise</Button>
                 </div>
             </div>
          </div>
          
          {activeYear && (
             <div className="border rounded-lg mt-6 bg-white dark:bg-card w-full min-w-0 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full max-w-[calc(100vw-2.5rem)] md:max-w-full no-scrollbar">
                  <Table className="min-w-[650px] w-full">
                      <TableHeader>
                          <TableRow className="bg-muted/30">
                              <TableHead className="font-bold">Term / Progression</TableHead>
                              <TableHead className="font-bold">Status</TableHead>
                              <TableHead className="text-right font-bold">Migration Gate</TableHead>
                              <TableHead className="text-right font-bold">Control Action</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {[...terms].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((term, idx, arr) => {
                              const isPrevFinalised = idx === 0 || arr[idx-1].is_finalised;
                              const isUnlocked = isPrevFinalised;
                              
                              return (
                                  <TableRow key={term.id} className={cn("hover:bg-muted/10 transition-colors", !term.is_finalised && isUnlocked && "bg-primary/[0.02]")}>
                                      <TableCell className="font-bold">
                                          <div className="flex items-center gap-2">
                                              {term.name}
                                              {!isUnlocked && <Lock className="h-3 w-3 opacity-30" />}
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          {term.is_finalised ? (
                                              <Badge variant="secondary" className="gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-600" /> Finalised (Locked)</Badge>
                                          ) : isUnlocked ? (
                                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Open (Current)</Badge>
                                          ) : (
                                              <Badge variant="outline" className="text-muted-foreground opacity-50">Locked</Badge>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                          {term.is_finalised && nextOpenTerm ? (
                                              <Button variant="outline" size="sm" onClick={() => initiateRollForward(term.id)} className="h-8 gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                  <ArrowRightCircle className="h-3 w-3" />
                                                  Roll Forward
                                              </Button>
                                          ) : null}
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <Button 
                                              variant={term.is_finalised ? "ghost" : "outline"} 
                                              size="sm" 
                                              disabled={validating || !!activeYear.closed || !isUnlocked} 
                                              onClick={() => handleTermAction(term.id, term.is_finalised)} 
                                              className={cn("h-8 min-w-[100px]", !term.is_finalised && isUnlocked && "border-primary text-primary hover:bg-primary/5")}
                                          >
                                              {validating && selectedTermId === term.id ? (
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : term.is_finalised ? (
                                                  <><Unlock className="h-3.5 w-3.5 mr-2 opacity-50" /> Re-open</>
                                              ) : (
                                                  <><Lock className="h-3.5 w-3.5 mr-2 opacity-50" /> Finalise</>
                                              )}
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                      </TableBody>
                  </Table>
                </div>
                
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/30 flex items-start gap-3 w-full min-w-0 shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Progression Rules</p>
                        <ul className="text-xs text-amber-700/80 dark:text-amber-500 list-disc pl-4 space-y-1 break-words whitespace-normal pr-2">
                            <li>You must finalise a term before the next one becomes available for data entry.</li>
                            <li>Finalising a term locks all assessments, marks, and attendance records as an official record.</li>
                            <li>A finalised term can only be re-opened if no subsequent terms have been finalised yet.</li>
                            <li>Roll forward allows you to copy learner lists to the next term without marks.</li>
                        </ul>
                    </div>
                </div>
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
      <AlertDialog open={deleteYearDialogOpen} onOpenChange={setDeleteYearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete academic cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{activeYear?.name}". This is only possible when the cycle has no dependent records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteYear}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={closeYearDialogOpen} onOpenChange={setCloseYearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close academic year?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this year locks all terms and records for the active cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!activeYear) return;
                closeYear(activeYear.id);
                setCloseYearDialogOpen(false);
                setStatusMessage("Saved ✓ Academic year closed.");
              }}
            >
              Close Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};