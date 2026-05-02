import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
    NotebookPen, 
    BookOpen, 
    Plus, 
    Trash2, 
    CalendarDays, 
    ArrowRight, 
    Eraser, 
    Copy, 
    Coffee,
    ArrowRightLeft
} from "lucide-react";
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/context/ClassesContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { useSafeForm } from "@/hooks/useSafeForm";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SafeInput } from "@/components/safe-form/SafeInput";
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMETABLE_FIELDS = ["subject", "start_time", "end_time", "class_id"] as const;
type TimetableField = (typeof TIMETABLE_FIELDS)[number];

const buildFieldKey = (day: string, period: number, field: TimetableField) =>
  `${day}_${period}_${field}`;

export const TimetableSettings = () => {
  const { timetable, updateEntry, clearEntry } = useTimetable();
  const { classes } = useClasses();

  // Find the highest period number currently in the database
  const maxPeriodInData = useMemo(() => {
    if (!timetable || timetable.length === 0) return 0;
    return Math.max(...timetable.map(t => t.period));
  }, [timetable]);

  const initialFormValues = useMemo(() => {
    const values: Record<string, string> = {
      numRows: Math.max(maxPeriodInData, 0).toString(),
    };
    for (const day of DAYS) {
      for (const entry of timetable.filter((t) => t.day === day)) {
        values[buildFieldKey(day, entry.period, "subject")] = entry.subject ?? "";
        values[buildFieldKey(day, entry.period, "start_time")] = entry.start_time ?? "";
        values[buildFieldKey(day, entry.period, "end_time")] = entry.end_time ?? "";
        values[buildFieldKey(day, entry.period, "class_id")] = entry.class_id ?? "";
      }
    }
    return values;
  }, [maxPeriodInData, timetable]);

  const form = useSafeForm({ initialValues: initialFormValues });
  const initializedRef = useRef(false);
  const { reset } = form;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const pendingUpdatesRef = useRef<Record<string, { day: string; period: number; payload: Record<string, string | number | null | undefined> }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: "day" | "row" | "remove"; value: string | number } | null>(null);
  const numRows = Number(form.values.numRows || "0");

  const markTouched = useCallback((name: string) => {
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  const rowValidationRules = useMemo(
    () => ({
      numRows: [
        { type: "required" as const, message: "Number of periods is required." },
        { type: "number" as const, message: "Number of periods must be a number." },
      ],
      subject: [{ type: "required" as const, message: "Subject is required." }],
      start_time: [{ type: "required" as const, message: "Start time is required." }],
      end_time: [{ type: "required" as const, message: "End time is required." }],
      class_id: [{ type: "required" as const, message: "Class is required." }],
    }),
    [],
  );

  useEffect(() => {
    if (!timetable || initializedRef.current) return;
    if (Object.keys(pendingUpdatesRef.current).length > 0) return;

    const mappedValues: Record<string, string> = {
      numRows: Math.max(
        timetable.length ? Math.max(...timetable.map((entry) => entry.period)) : 0,
        0,
      ).toString(),
    };

    for (const day of DAYS) {
      for (const entry of timetable.filter((item) => item.day === day)) {
        mappedValues[buildFieldKey(day, entry.period, "subject")] = entry.subject ?? "";
        mappedValues[buildFieldKey(day, entry.period, "start_time")] = entry.start_time ?? "";
        mappedValues[buildFieldKey(day, entry.period, "end_time")] = entry.end_time ?? "";
        mappedValues[buildFieldKey(day, entry.period, "class_id")] = entry.class_id ?? "";
      }
    }

    reset(mappedValues);
    initializedRef.current = true;
  }, [timetable, reset]);

  const periods = useMemo(() => {
    const p = [];
    for (let i = 1; i <= numRows; i++) p.push(i);
    return p;
  }, [numRows]);

  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  const queueEntryUpdate = useCallback((day: string, period: number, payload: Record<string, string | number | null | undefined>) => {
    pendingUpdatesRef.current[`${day}_${period}`] = { day, period, payload };
  }, []);

  const handleUpdate = (day: string, period: number, field: TimetableField, value: string) => {
    const current = getEntry(day, period);

    if (field === "class_id") {
      const cls = classes.find((c) => c.id === value);
      if (cls) {
        form.setFieldValue(buildFieldKey(day, period, "class_id"), cls.id, rowValidationRules.class_id);
        const currentSubject = form.values[buildFieldKey(day, period, "subject")] || current?.subject || "";
        const nextSubject = currentSubject.trim() ? currentSubject : (cls.subject ?? "");
        form.setFieldValue(buildFieldKey(day, period, "subject"), nextSubject, rowValidationRules.subject);
        queueEntryUpdate(day, period, {
          day,
          period,
          class_id: cls.id,
          class_name: cls.className,
          subject: nextSubject,
        });
        return;
      }
    }

    form.setFieldValue(buildFieldKey(day, period, field), value, rowValidationRules[field]);
    queueEntryUpdate(day, period, {
      ...current,
      day,
      period,
      [field]: value,
    });
  };

  const handleSaveTimetable = useCallback(async () => {
    const pending = Object.values(pendingUpdatesRef.current);
    if (pending.length === 0) return;
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage("Saving...");
    try {
      for (const item of pending) {
        await updateEntry(item.payload);
      }
      pendingUpdatesRef.current = {};
      form.reset(form.values);
      setStatusMessage("Saved ✓");
    } catch {
      setErrorMessage("Failed to auto-save timetable changes.");
      setStatusMessage(null);
    } finally {
      setIsSaving(false);
    }
  }, [form, updateEntry]);

  const autoSave = useAutoSave({
    isDirty: form.isDirty,
    onSave: () => handleSaveTimetable(),
    delayMs: 1200,
    enabled: true,
  });
  const feedbackPhase =
    isSaving || autoSave.isSaving
      ? "saving"
      : errorMessage || autoSave.saveError
        ? "error"
        : statusMessage || autoSave.didSave
          ? "success"
          : "idle";
  const feedbackMessage =
    statusMessage ?? (isSaving || autoSave.isSaving ? "Saving..." : autoSave.didSave ? "Saved ✓" : null);
  const feedbackError = errorMessage ?? autoSave.saveError;

  const handleCloneDay = async (sourceDay: string, targetDay: string) => {
      if (sourceDay === targetDay) return;
      
      const sourceEntries = timetable.filter(t => t.day === sourceDay);
      if (sourceEntries.length === 0) {
          showError(`No data found for ${sourceDay} to copy.`);
          setErrorMessage(`No data found for ${sourceDay} to copy.`);
          return;
      }

      for (const entry of sourceEntries) {
          await updateEntry({
              ...entry,
              id: undefined, 
              day: targetDay
          });
      }
      showSuccess(`Cloned ${sourceDay} schedule to ${targetDay}.`);
      setStatusMessage(`Saved ✓ ${sourceDay} copied to ${targetDay}.`);
  };

  const handleClearDay = async (day: string) => {
      const dayEntries = timetable.filter(t => t.day === day);
      for (const entry of dayEntries) {
          await clearEntry(day, entry.period);
      }
      showSuccess(`${day} schedule cleared.`);
      setStatusMessage(`Saved ✓ ${day} schedule cleared.`);
      setConfirmState(null);
  };

  const handleToggleBreak = async (period: number) => {
      const isBreak = DAYS.every(day => getEntry(day, period)?.class_name === "BREAK");
      const nextVal = isBreak ? "" : "BREAK";
      const nextSub = isBreak ? "" : "Staff Break / Lunch";

      for (const day of DAYS) {
          const current = getEntry(day, period);
          await updateEntry({
              ...current,
              day, period,
              class_name: nextVal,
              class_id: null,
              subject: nextSub
          });
      }
      showSuccess(isBreak ? `Period ${period} reverted to class time.` : `Period ${period} marked as Break across all days.`);
      setStatusMessage(isBreak ? `Saved ✓ Period ${period} reverted to class time.` : `Saved ✓ Period ${period} marked as break.`);
  };

  const handleClearRow = async (period: number) => {
    for (const day of DAYS) {
        await clearEntry(day, period);
    }
    showSuccess(`Period ${period} cleared.`);
    setStatusMessage(`Saved ✓ Period ${period} cleared.`);
    setConfirmState(null);
  };

  const handleRemoveLastRow = async (force = false) => {
      if (numRows <= 0) return;
      const lastPeriod = numRows;
      if (timetable.some(t => t.period === lastPeriod)) {
          if (!force) {
            setConfirmState({ type: "remove", value: lastPeriod });
            return;
          }
          for (const day of DAYS) await clearEntry(day, lastPeriod);
      }
      const nextRows = Math.max(lastPeriod - 1, 0);
      form.setFieldValue("numRows", String(nextRows), rowValidationRules.numRows);
      markTouched("numRows");
      void form.validateField("numRows", rowValidationRules.numRows, String(nextRows));
      setStatusMessage(`Saved ✓ Period ${lastPeriod} removed.`);
      setConfirmState(null);
  };

  return (
    <Card className="col-span-full border-primary/20 bg-primary/[0.01] w-full min-w-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary shrink-0" />
                    <CardTitle className="truncate">Routine & Schedule</CardTitle>
                </div>
                <CardDescription className="truncate">Configure your teaching periods and session times.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                {numRows > 0 && <Button variant="outline" size="sm" onClick={() => handleRemoveLastRow()} className="flex-1 sm:flex-none h-10 sm:h-9"><Trash2 className="h-4 w-4 mr-2" /> Remove Row</Button>}
                <Button
                  size="sm"
                  onClick={() => {
                    const nextRows = numRows + 1;
                    form.setFieldValue("numRows", String(nextRows), rowValidationRules.numRows);
                    markTouched("numRows");
                    void form.validateField("numRows", rowValidationRules.numRows, String(nextRows));
                  }}
                  className="flex-1 sm:flex-none h-10 sm:h-9 font-bold"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Period
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="w-full min-w-0 space-y-4">
        <AsyncStatus
          state={{
            status: feedbackPhase,
            error: feedbackError,
            retry: autoSave.retryLastSave,
          }}
        />
        {numRows === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-white dark:bg-card mx-2">
                <div className="p-4 bg-primary/5 rounded-full mb-4"><CalendarDays className="h-10 w-10 text-primary/40" /></div>
                <h3 className="text-lg font-bold">Your Timetable is Empty</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">Add your first period to start planning.</p>
                <Button
                  onClick={() => {
                    form.setFieldValue("numRows", "1", rowValidationRules.numRows);
                    markTouched("numRows");
                    void form.validateField("numRows", rowValidationRules.numRows, "1");
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Define Period 1
                </Button>
            </div>
        ) : (
            <div className="overflow-x-auto border rounded-xl shadow-sm bg-background w-full no-scrollbar max-w-[calc(100vw-2.5rem)] md:max-w-full">
                <Table className="table-fixed w-full min-w-[1000px]">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[120px] text-center border-r font-bold text-[10px] uppercase tracking-widest sticky left-0 z-20 bg-muted/90 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Session</TableHead>
                            {DAYS.map(day => (
                                <TableHead key={day} className="text-center font-bold text-[10px] uppercase tracking-widest relative group/col">
                                    <div className="flex items-center justify-center gap-2">
                                        {day}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                                                    <ArrowRightLeft className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center">
                                                <DropdownMenuLabel className="text-[9px] uppercase tracking-wider">Day Tools: {day}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-xs" onClick={() => setConfirmState({ type: "day", value: day })}>
                                                    <Eraser className="h-3.5 w-3.5 mr-2 text-orange-500" /> Clear Entries
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-[9px] text-muted-foreground">Clone Schedule To...</DropdownMenuLabel>
                                                {DAYS.filter(d => d !== day).map(target => (
                                                    <DropdownMenuItem key={target} className="text-xs" onClick={() => handleCloneDay(day, target)}>
                                                        <Copy className="h-3.5 w-3.5 mr-2" /> {target}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periods.map(period => {
                            const isRowBreak = DAYS.every(d => getEntry(d, period)?.class_name === "BREAK");
                            return (
                                <TableRow key={period} className={cn("min-h-[140px] group/row", isRowBreak && "bg-amber-50/30")}>
                                    <TableCell className="bg-muted/90 backdrop-blur-sm border-r p-3 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-muted-foreground">P</span>
                                                <span className="font-black text-2xl text-primary">{period}</span>
                                            </div>
                                            <div className="space-y-1.5 w-full bg-white dark:bg-background p-2 rounded-md border border-muted shadow-sm">
                                                <SafeInput
                                                  type="time"
                                                  name={buildFieldKey(DAYS[0], period, "start_time")}
                                                  form={form}
                                                  rules={rowValidationRules.start_time}
                                                  error={touched[buildFieldKey(DAYS[0], period, "start_time")] ? form.errors[buildFieldKey(DAYS[0], period, "start_time")] : undefined}
                                                  className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30"
                                                  onChange={(e) => DAYS.forEach(d => handleUpdate(d, period, "start_time", e.target.value))}
                                                  onBlur={() => {
                                                    const key = buildFieldKey(DAYS[0], period, "start_time");
                                                    markTouched(key);
                                                    void form.validateField(key, rowValidationRules.start_time);
                                                  }}
                                                />
                                                <SafeInput
                                                  type="time"
                                                  name={buildFieldKey(DAYS[0], period, "end_time")}
                                                  form={form}
                                                  rules={rowValidationRules.end_time}
                                                  error={touched[buildFieldKey(DAYS[0], period, "end_time")] ? form.errors[buildFieldKey(DAYS[0], period, "end_time")] : undefined}
                                                  className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30"
                                                  onChange={(e) => DAYS.forEach(d => handleUpdate(d, period, "end_time", e.target.value))}
                                                  onBlur={() => {
                                                    const key = buildFieldKey(DAYS[0], period, "end_time");
                                                    markTouched(key);
                                                    void form.validateField(key, rowValidationRules.end_time);
                                                  }}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 w-full opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                <Button variant="outline" size="sm" className={cn("h-7 text-[8px] font-black uppercase gap-1 shadow-sm", isRowBreak ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-white")} onClick={() => handleToggleBreak(period)}>
                                                    <Coffee className="h-2.5 w-2.5" /> {isRowBreak ? "Lesson Time" : "Mark Break"}
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 text-[8px] font-bold uppercase gap-1 text-muted-foreground hover:text-destructive" onClick={() => setConfirmState({ type: "row", value: period })}>
                                                    <Eraser className="h-2.5 w-2.5" /> Clear
                                                </Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                    {DAYS.map(day => {
                                        const entry = getEntry(day, period);
                                        const isSlotBreak = entry?.class_name === "BREAK";
                                        return (
                                            <TableCell key={`${day}-${period}`} className={cn("p-3 align-top border-l relative h-full transition-colors", isSlotBreak && "bg-amber-50/50")}>
                                                <div className="flex flex-col gap-2 h-full">
                                                    {isSlotBreak ? (
                                                        <div className="flex flex-col items-center justify-center py-6 text-amber-600/40 gap-1 animate-in fade-in zoom-in duration-300">
                                                            <Coffee className="h-8 w-8" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Recess</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Select
                                                              value={form.values[buildFieldKey(day, period, "class_id")] ?? entry?.class_id ?? ""}
                                                              onValueChange={(val) => {
                                                                if (val === "clear") {
                                                                  clearEntry(day, period);
                                                                  form.setFieldValue(buildFieldKey(day, period, "class_id"), "", rowValidationRules.class_id);
                                                                  return;
                                                                }
                                                                const key = buildFieldKey(day, period, "class_id");
                                                                markTouched(key);
                                                                void form.validateField(key, rowValidationRules.class_id, val);
                                                                handleUpdate(day, period, "class_id", val);
                                                              }}
                                                            >
                                                                <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-none bg-muted/40 hover:bg-muted/60 transition-colors"><SelectValue placeholder="SET CLASS" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="clear" className="text-destructive font-bold">-- Clear Slot --</SelectItem>
                                                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="relative">
                                                                <BookOpen className="absolute left-1.5 top-1.5 h-3 w-3 text-muted-foreground/50" />
                                                                <SafeInput
                                                                  name={buildFieldKey(day, period, "subject")}
                                                                  form={form}
                                                                  rules={rowValidationRules.subject}
                                                                  error={touched[buildFieldKey(day, period, "subject")] ? form.errors[buildFieldKey(day, period, "subject")] : undefined}
                                                                  placeholder="Subject..."
                                                                  className="h-8 text-[11px] pl-6 border-muted bg-transparent focus-visible:ring-primary/30"
                                                                  onChange={(e) => handleUpdate(day, period, "subject", e.target.value)}
                                                                  onBlur={() => {
                                                                    const key = buildFieldKey(day, period, "subject");
                                                                    markTouched(key);
                                                                    void form.validateField(key, rowValidationRules.subject);
                                                                  }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-auto pt-2 border-t border-dashed border-muted">
                                                                <SafeInput
                                                                  type="time"
                                                                  name={buildFieldKey(day, period, "start_time")}
                                                                  form={form}
                                                                  rules={rowValidationRules.start_time}
                                                                  error={touched[buildFieldKey(day, period, "start_time")] ? form.errors[buildFieldKey(day, period, "start_time")] : undefined}
                                                                  className="h-6 text-[8px] p-1 border-none bg-muted/20"
                                                                  onChange={(e) => handleUpdate(day, period, "start_time", e.target.value)}
                                                                  onBlur={() => {
                                                                    const key = buildFieldKey(day, period, "start_time");
                                                                    markTouched(key);
                                                                    void form.validateField(key, rowValidationRules.start_time);
                                                                  }}
                                                                />
                                                                <span className="text-[8px] opacity-30">-</span>
                                                                <SafeInput
                                                                  type="time"
                                                                  name={buildFieldKey(day, period, "end_time")}
                                                                  form={form}
                                                                  rules={rowValidationRules.end_time}
                                                                  error={touched[buildFieldKey(day, period, "end_time")] ? form.errors[buildFieldKey(day, period, "end_time")] : undefined}
                                                                  className="h-6 text-[8px] p-1 border-none bg-muted/20"
                                                                  onChange={(e) => handleUpdate(day, period, "end_time", e.target.value)}
                                                                  onBlur={() => {
                                                                    const key = buildFieldKey(day, period, "end_time");
                                                                    markTouched(key);
                                                                    void form.validateField(key, rowValidationRules.end_time);
                                                                  }}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
      <AlertDialog open={confirmState !== null} onOpenChange={(open) => !open && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState?.type === "day" && `Clear ${confirmState.value} schedule?`}
              {confirmState?.type === "row" && `Clear Period ${confirmState.value}?`}
              {confirmState?.type === "remove" && `Remove Period ${confirmState.value}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState?.type === "day" && "All class slots for this day will be cleared. Times remain where set."}
              {confirmState?.type === "row" && "All classes scheduled for this period across all days will be removed."}
              {confirmState?.type === "remove" && "This period contains data. Removing it will clear all entries in that period."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmState) return;
                if (confirmState.type === "day") handleClearDay(String(confirmState.value));
                if (confirmState.type === "row") handleClearRow(Number(confirmState.value));
                if (confirmState.type === "remove") handleRemoveLastRow(true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};