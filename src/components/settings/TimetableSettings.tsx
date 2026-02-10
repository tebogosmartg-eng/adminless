import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableSettings = () => {
  const { timetable, updateEntry, clearEntry } = useTimetable();
  const { classes } = useClasses();

  const maxPeriodInData = useMemo(() => {
    if (timetable.length === 0) return 0;
    return Math.max(...timetable.map(t => t.period));
  }, [timetable]);

  const [numRows, setNumRows] = useState(() => maxPeriodInData);

  useMemo(() => {
    if (maxPeriodInData > numRows) {
        setNumRows(maxPeriodInData);
    }
  }, [maxPeriodInData]);

  const periods = useMemo(() => {
    const p = [];
    for (let i = 1; i <= numRows; i++) p.push(i);
    return p;
  }, [numRows]);

  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  const handleUpdate = (day: string, period: number, field: string, value: string) => {
    const current = getEntry(day, period);
    
    if (field === 'class_id') {
       const cls = classes.find(c => c.id === value);
       if (cls) {
           updateEntry({
               day, period,
               class_id: cls.id,
               class_name: cls.className,
               subject: current?.subject || cls.subject
           });
           return;
       }
    }

    updateEntry({
        ...current,
        day, period,
        [field]: value
    });
  };

  const handleCloneDay = async (sourceDay: string, targetDay: string) => {
      if (sourceDay === targetDay) return;
      
      const sourceEntries = timetable.filter(t => t.day === sourceDay);
      if (sourceEntries.length === 0) {
          showError(`No data found for ${sourceDay} to copy.`);
          return;
      }

      for (const entry of sourceEntries) {
          await updateEntry({
              ...entry,
              id: undefined, // Create new record
              day: targetDay
          });
      }
      showSuccess(`Cloned ${sourceDay} schedule to ${targetDay}.`);
  };

  const handleClearDay = async (day: string) => {
      if (confirm(`Clear all scheduled entries for ${day}? Times will be preserved if set.`)) {
          const dayEntries = timetable.filter(t => t.day === day);
          for (const entry of dayEntries) {
              await clearEntry(day, entry.period);
          }
          showSuccess(`${day} schedule cleared.`);
      }
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
  };

  const handleClearRow = async (period: number) => {
    if (confirm(`Clear all classes scheduled for Period ${period}?`)) {
        for (const day of DAYS) {
            await clearEntry(day, period);
        }
    }
  };

  const handleRemoveLastRow = async () => {
      if (numRows <= 0) return;
      const lastPeriod = numRows;
      if (timetable.some(t => t.period === lastPeriod)) {
          if (!confirm(`Period ${lastPeriod} has data. Remove anyway?`)) return;
          for (const day of DAYS) await clearEntry(day, lastPeriod);
      }
      setNumRows(prev => prev - 1);
  };

  return (
    <Card className="col-span-full border-primary/20 bg-primary/[0.01]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary" />
                    <CardTitle>Routine & Schedule</CardTitle>
                </div>
                <CardDescription>Configure your teaching periods and session times.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                {numRows > 0 && <Button variant="outline" size="sm" onClick={handleRemoveLastRow} className="flex-1 sm:flex-none"><Trash2 className="h-4 w-4 mr-2" /> Remove Row</Button>}
                <Button size="sm" onClick={() => setNumRows(prev => prev + 1)} className="flex-1 sm:flex-none font-bold"><Plus className="h-4 w-4 mr-2" /> Add Period</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {numRows === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-white dark:bg-card">
                <div className="p-4 bg-primary/5 rounded-full mb-4"><CalendarDays className="h-10 w-10 text-primary/40" /></div>
                <h3 className="text-lg font-bold">Your Timetable is Empty</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">Add your first period to start planning.</p>
                <Button onClick={() => setNumRows(1)} className="gap-2"><Plus className="h-4 w-4" /> Define Period 1</Button>
            </div>
        ) : (
            <div className="overflow-x-auto border rounded-xl shadow-sm bg-background">
                <Table className="table-fixed w-full min-w-[1000px]">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[120px] text-center border-r font-bold text-[10px] uppercase tracking-widest">Session</TableHead>
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
                                                <DropdownMenuItem className="text-xs" onClick={() => handleClearDay(day)}>
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
                                    <TableCell className="bg-muted/20 border-r p-3">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-muted-foreground">P</span>
                                                <span className="font-black text-2xl text-primary">{period}</span>
                                            </div>
                                            <div className="space-y-1.5 w-full bg-white dark:bg-background p-2 rounded-md border border-muted shadow-sm">
                                                <Input type="time" className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30" onChange={(e) => DAYS.forEach(d => handleUpdate(d, period, 'start_time', e.target.value))} />
                                                <Input type="time" className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30" onChange={(e) => DAYS.forEach(d => handleUpdate(d, period, 'end_time', e.target.value))} />
                                            </div>
                                            <div className="flex flex-col gap-1 w-full opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                <Button variant="outline" size="sm" className={cn("h-7 text-[8px] font-black uppercase gap-1 shadow-sm", isRowBreak ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-white")} onClick={() => handleToggleBreak(period)}>
                                                    <Coffee className="h-2.5 w-2.5" /> {isRowBreak ? "Lesson Time" : "Mark Break"}
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 text-[8px] font-bold uppercase gap-1 text-muted-foreground hover:text-destructive" onClick={() => handleClearRow(period)}>
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
                                                            <Select value={entry?.class_id || ""} onValueChange={(val) => { if (val === "clear") { clearEntry(day, period); return; } handleUpdate(day, period, 'class_id', val); }}>
                                                                <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-none bg-muted/40 hover:bg-muted/60 transition-colors"><SelectValue placeholder="SET CLASS" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="clear" className="text-destructive font-bold">-- Clear Slot --</SelectItem>
                                                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="relative">
                                                                <BookOpen className="absolute left-1.5 top-1.5 h-3 w-3 text-muted-foreground/50" />
                                                                <Input placeholder="Subject..." className="h-8 text-[11px] pl-6 border-muted bg-transparent focus-visible:ring-primary/30" value={entry?.subject || ''} onChange={(e) => handleUpdate(day, period, 'subject', e.target.value)} />
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-auto pt-2 border-t border-dashed border-muted">
                                                                <Input type="time" value={entry?.start_time || ''} onChange={(e) => handleUpdate(day, period, 'start_time', e.target.value)} className="h-6 text-[8px] p-1 border-none bg-muted/20" />
                                                                <span className="text-[8px] opacity-30">-</span>
                                                                <Input type="time" value={entry?.end_time || ''} onChange={(e) => handleUpdate(day, period, 'end_time', e.target.value)} className="h-6 text-[8px] p-1 border-none bg-muted/20" />
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
    </Card>
  );
};