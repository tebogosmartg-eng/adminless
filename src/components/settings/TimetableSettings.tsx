import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NotebookPen, BookOpen, Clock, Plus, Trash2 } from "lucide-react";
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

  // Track how many rows the user wants to see
  // Initialize with the data's max period or 5 as a sensible starting point for new users
  const [numRows, setNumRows] = useState(() => Math.max(maxPeriodInData, 5));

  // Sync numRows if data grows beyond current view (e.g. from sync)
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

  // Helper to find entry
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
      if (numRows <= 1) return;
      
      const lastPeriod = numRows;
      const hasData = DAYS.some(day => {
          const entry = getEntry(day, lastPeriod);
          return entry && (entry.class_id || entry.subject || entry.start_time);
      });

      if (hasData) {
          if (!confirm(`Period ${lastPeriod} has scheduled classes. Removing this row will delete all data for this period across all days. Proceed?`)) {
              return;
          }
          // Clear all entries for this period
          for (const day of DAYS) {
              await clearEntry(day, lastPeriod);
          }
      }
      
      setNumRows(prev => prev - 1);
  };

  return (
    <Card className="col-span-full border-primary/20 bg-primary/[0.01]">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary" />
                    <CardTitle>My Personal Teaching Schedule</CardTitle>
                </div>
                <CardDescription>Plan your weekly routine by setting your classes, subjects, and session times.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRemoveLastRow} disabled={numRows <= 1}>
                    <Trash2 className="h-4 w-4 mr-2" /> Remove Row
                </Button>
                <Button size="sm" onClick={() => setNumRows(prev => prev + 1)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Period
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-background">
            <Table className="table-fixed w-full min-w-[1000px]">
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[100px] text-center border-r font-bold">Session</TableHead>
                        {DAYS.map(day => <TableHead key={day} className="text-center font-bold">{day}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {periods.map(period => (
                        <TableRow key={period} className="min-h-[140px]">
                            <TableCell className="bg-muted/20 border-r p-3">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="font-black text-lg text-muted-foreground">{period}</span>
                                    <div className="space-y-1.5 w-full">
                                        <div className="relative">
                                            <Clock className="absolute left-1.5 top-2 h-2.5 w-2.5 text-muted-foreground opacity-50" />
                                            <Input 
                                                type="time" 
                                                className="h-7 text-[9px] pl-5 pr-1 border-muted bg-white" 
                                                onChange={(e) => {
                                                    DAYS.forEach(d => handleUpdate(d, period, 'start_time', e.target.value));
                                                }}
                                            />
                                        </div>
                                        <Input 
                                            type="time" 
                                            className="h-7 text-[9px] px-1 border-muted bg-white" 
                                            onChange={(e) => {
                                                DAYS.forEach(d => handleUpdate(d, period, 'end_time', e.target.value));
                                            }}
                                        />
                                    </div>
                                    <p className="text-[8px] text-center font-bold uppercase text-muted-foreground leading-tight">Apply to Row</p>
                                </div>
                            </TableCell>
                            {DAYS.map(day => {
                                const entry = getEntry(day, period);
                                return (
                                    <TableCell key={`${day}-${period}`} className="p-3 align-top border-l relative group h-full">
                                        <div className="flex flex-col gap-2 h-full">
                                            <div className="flex items-center gap-1">
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
                                                        <SelectItem value="custom" disabled>Custom Entry</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

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
      </CardContent>
    </Card>
  );
};