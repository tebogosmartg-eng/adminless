import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Lock, Unlock, Plus, AlertCircle, Loader2, Archive } from "lucide-react";
import { useAcademic } from '@/context/AcademicContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTermValidation, ValidationError } from '@/hooks/useTermValidation';
import { TermClosureDialog } from '@/components/dialogs/TermClosureDialog';

export const AcademicYearSettings = () => {
  const { years, terms, activeYear, setActiveYear, createYear, updateTerm, toggleTermStatus, closeYear } = useAcademic();
  const [newYearName, setNewYearName] = useState("");
  
  // Validation State
  const { validateTerm, validating } = useTermValidation();
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isValidToClose, setIsValidToClose] = useState(false);

  const handleCreateYear = async () => {
    if (newYearName.trim()) {
      await createYear(newYearName.trim());
      setNewYearName("");
    }
  };

  const handleTermAction = async (termId: string, currentStatus: boolean) => {
    if (currentStatus) {
        if (activeYear?.closed) {
            alert("Cannot re-open term because the academic year is closed.");
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

  const handleFinalizeYear = async () => {
      if (!activeYear) return;
      
      const allTermsClosed = terms.every(t => t.closed);
      if (!allTermsClosed) {
          alert("All terms must be closed before finalizing the year.");
          return;
      }

      if (confirm(`Are you sure you want to close ${activeYear.name}? This action is permanent.`)) {
          await closeYear(activeYear.id);
      }
  };

  const DatePicker = ({ date, onSelect, disabled }: { date: string | null, onSelect: (d: Date | undefined) => void, disabled: boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          size="sm"
          disabled={disabled}
          className={cn(
            "w-[130px] justify-start text-left font-normal h-8",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(new Date(date), "dd/MM/yyyy") : <span>Pick date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  const totalWeight = useMemo(() => terms.reduce((acc, t) => acc + Number(t.weight), 0), [terms]);
  const isWeightValid = totalWeight === 100;
  const allTermsClosed = terms.length > 0 && terms.every(t => t.closed);

  return (
    <div className="grid gap-6 md:grid-cols-1">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Academic Configuration</CardTitle>
                <CardDescription>
                    Define your academic cycle. Ensure term weights sum to 100% for year-end reporting.
                </CardDescription>
            </div>
            {activeYear && !activeYear.closed && (
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleFinalizeYear} 
                    disabled={!allTermsClosed || !isWeightValid}
                    title={!allTermsClosed ? "Close all terms first" : "Finalize Year"}
                >
                    <Archive className="mr-2 h-4 w-4" /> Finalize Year
                </Button>
            )}
            {activeYear?.closed && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 px-3 py-1">
                    <Lock className="h-3 w-3 mr-2" /> Year Finalized
                </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Select Current Year</label>
                <Select value={activeYear?.id} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                    <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                    {years.map(y => (
                        <SelectItem key={y.id} value={y.id}>{y.name} {y.closed ? "(Closed)" : ""}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
             </div>
             
             <div className="space-y-1.5 ml-auto">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">New Academic Cycle</label>
                 <div className="flex gap-2">
                    <Input 
                        placeholder="e.g. 2026" 
                        value={newYearName}
                        onChange={(e) => setNewYearName(e.target.value)}
                        className="w-[180px]"
                    />
                    <Button onClick={handleCreateYear} variant="secondary">
                        <Plus className="mr-2 h-4 w-4" /> Create
                    </Button>
                 </div>
             </div>
          </div>
          
          {activeYear && (
             <div className="border rounded-lg mt-6 overflow-hidden bg-white dark:bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Term / Period</TableHead>
                            <TableHead className="font-bold">Start Date</TableHead>
                            <TableHead className="font-bold">End Date</TableHead>
                            <TableHead className="font-bold">Weighting</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="text-right font-bold">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {terms.map(term => (
                            <TableRow key={term.id} className="hover:bg-muted/10">
                                <TableCell className="font-bold">{term.name}</TableCell>
                                <TableCell>
                                    <DatePicker 
                                        date={term.start_date} 
                                        disabled={term.closed || !!activeYear.closed}
                                        onSelect={(d) => d && updateTerm({ ...term, start_date: d.toISOString() })} 
                                    />
                                </TableCell>
                                <TableCell>
                                    <DatePicker 
                                        date={term.end_date} 
                                        disabled={term.closed || !!activeYear.closed}
                                        onSelect={(d) => d && updateTerm({ ...term, end_date: d.toISOString() })} 
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            className="w-16 h-8 text-center"
                                            value={term.weight}
                                            disabled={term.closed || !!activeYear.closed}
                                            onChange={(e) => updateTerm({ ...term, weight: parseFloat(e.target.value) })}
                                        />
                                        <span className="text-muted-foreground text-xs">%</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={term.closed ? "secondary" : "outline"} className={term.closed ? "bg-muted text-muted-foreground" : "bg-green-50 text-green-700 border-green-200"}>
                                        {term.closed ? "Closed" : "Open"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      disabled={(validating && selectedTermId === term.id) || !!activeYear.closed}
                                      onClick={() => handleTermAction(term.id, term.closed)}
                                      className="h-8"
                                    >
                                        {validating && selectedTermId === term.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            term.closed ? <Unlock className="h-4 w-4 mr-1 opacity-50" /> : <Lock className="h-4 w-4 mr-1 opacity-50" />
                                        )}
                                        {term.closed ? "Re-open" : "Finalize"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-4 bg-muted/20 flex justify-end items-center gap-3 border-t">
                    <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Combined Year Weight:</span>
                    <span className={cn("text-sm font-bold", isWeightValid ? "text-green-600" : "text-amber-600")}>
                        {totalWeight}%
                    </span>
                    {!isWeightValid && (
                       <Tooltip>
                           <TooltipTrigger><AlertCircle className="h-4 w-4 text-amber-500" /></TooltipTrigger>
                           <TooltipContent>Year weights should sum to 100%.</TooltipContent>
                       </Tooltip>
                    )}
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
    </div>
  );
};