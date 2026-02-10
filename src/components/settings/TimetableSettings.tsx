import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NotebookPen, BookOpen, Clock, Plus, Trash2, CalendarDays, ArrowRight } from "lucide-react";
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/context/ClassesContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableSettings = () => {
  const { timetable, updateEntry, clearEntry } = useTimetable();
  const { classes } = useClasses();

  // Find the highest period number currently in the database
  const maxPeriodInData = useMemo(() => {
    if (timetable.length === 0) return 0;
    return Math.max(...timetable.map(t => t.period));
  }, [timetable]);

  // Strictly follow data, no placeholders by default
  const [numRows, setNumRows] = useState(() => maxPeriodInData);

  // Sync numRows if data grows (e.g. from sync)
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

  const handleRemoveLastRow = async () => {
      if (numRows <= 0) return;
      
      const lastPeriod = numRows;
      const hasData = DAYS.some(day => {
          const entry = getEntry(day, lastPeriod);
          return entry && (entry.class_id || entry.subject || entry.start_time);
      });

      if (hasData) {
          if (!confirm(`Period ${lastPeriod} has scheduled classes. Removing this row will delete all data for this period across all days. Proceed?`)) {
              return;
          }
          for (const day of DAYS) {
              await clearEntry(day, lastPeriod);
          }
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
                <CardDescription>Define your teaching periods. The dashboard will show alerts for classes active during current times.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                {numRows > 0 && (
                    <Button variant="outline" size="sm" onClick={handleRemoveLastRow} className="flex-1 sm:flex-none">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Row
                    </Button>
                )}
                <Button size="sm" onClick={() => setNumRows(prev => prev + 1)} className="flex-1 sm:flex-none font-bold">
                    <Plus className="h-4 w-4 mr-2" /> Add Period
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {numRows === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-white dark:bg-card">
                <div className="p-4 bg-primary/5 rounded-full mb-4">
                    <CalendarDays className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="text-lg font-bold">Your Timetable is Empty</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Add your first period to start planning your daily agenda and classroom logs.
                </p>
                <Button onClick={() => setNumRows(1)} className="gap-2">
                    <Plus className="h-4 w-4" /> Define Period 1
                </Button>
            </div>
        ) : (
            <div className="overflow-x-auto border rounded-xl shadow-sm bg-background">
                <Table className="table-fixed w-full min-w-[1000px]">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[120px] text-center border-r font-bold text-[10px] uppercase tracking-widest">Session</TableHead>
                            {DAYS.map(day => (
                                <TableHead key={day} className="text-center font-bold text-[10px] uppercase tracking-widest">
                                    {day}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periods.map(period => (
                            <TableRow key={period} className="min-h-[140px] group/row">
                                <TableCell className="bg-muted/20 border-r p-3">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-muted-foreground">P</span>
                                            <span className="font-black text-2xl text-primary">{period}</span>
                                        </div>
                                        <div className="space-y-1.5 w-full bg-white dark:bg-background p-2 rounded-md border border-muted shadow-sm">
                                            <div className="flex items-center justify-between text-[8px] font-black uppercase text-muted-foreground mb-1">
                                                <span>Times</span>
                                                <ArrowRight className="h-2 w-2" />
                                            </div>
                                            <Input 
                                                type="time" 
                                                className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30" 
                                                onChange={(e) => {
                                                    DAYS.forEach(d => handleUpdate(d, period, 'start_time', e.target.value));
                                                }}
                                            />
                                            <Input 
                                                type="time" 
                                                className="h-7 text-[9px] px-1 border-none focus-visible:ring-0 bg-muted/30" 
                                                onChange={(e) => {
                                                    DAYS.forEach(d => handleUpdate(d, period, 'end_time', e.target.value));
                                                }}
                                            />
                                        </div>
                                        <p className="text-[8px] text-center font-bold uppercase text-muted-foreground/60 leading-tight">Apply to Row</p>
                                    </div>
                                </TableCell>
                                {DAYS.map(day => {
                                    const entry = getEntry(day, period);
                                    return (
                                        <TableCell key={`${day}-${period}`} className="p-3 align-top border-l relative h-full">
                                            <div className="flex flex-col gap-2 h-full">
                                                <Select 
                                                    value={entry?.class_id || (entry?.class_name ? "custom" : "")} 
                                                    onValueChange={(val) => {
                                                        if (val === "clear") { clearEntry(day, period); return; }
                                                        handleUpdate(day, period, 'class_id', val);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-none bg-muted/40 hover:bg-muted/60 transition-colors">
                                                        <SelectValue placeholder="SET CLASS" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="clear" className="text-destructive font-bold">-- Clear Slot --</SelectItem>
                                                        {classes.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <div className="relative">
                                                    <BookOpen className="absolute left-1.5 top-1.5 h-3 w-3 text-muted-foreground/50" />
                                                    <Input 
                                                        placeholder="Subject..." 
                                                        className="h-8 text-[11px] pl-6 border-muted bg-transparent focus-visible:ring-primary/30" 
                                                        value={entry?.subject || ''}
                                                        onChange={(e) => handleUpdate(day, period, 'subject', e.target.value)}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1 mt-auto pt-2 border-t border-dashed border-muted">
                                                    <Input 
                                                        type="time" 
                                                        value={entry?.start_time || ''} 
                                                        onChange={(e) => handleUpdate(day, period, 'start_time', e.target.value)}
                                                        className="h-6 text-[8px] p-1 border-none bg-muted/20"
                                                    />
                                                    <span className="text-[8px] opacity-30">-</span>
                                                    <Input 
                                                        type="time" 
                                                        value={entry?.end_time || ''} 
                                                        onChange={(e) => handleUpdate(day, period, 'end_time', e.target.value)}
                                                        className="h-6 text-[8px] p-1 border-none bg-muted/20"
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
};