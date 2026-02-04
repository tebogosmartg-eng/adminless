import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NotebookPen, BookOpen, Clock } from "lucide-react";
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/context/ClassesContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export const TimetableSettings = () => {
  const { timetable, updateEntry, clearEntry } = useTimetable();
  const { classes } = useClasses();

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

  return (
    <Card className="col-span-full border-primary/20 bg-primary/[0.01]">
      <CardHeader>
        <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            <CardTitle>My Personal Teaching Schedule</CardTitle>
        </div>
        <CardDescription>Plan your weekly routine by setting your classes, subjects, and session times.</CardDescription>
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
                    {PERIODS.map(period => (
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
                                                // We apply the time from the first day of the period to all days in that row for convenience
                                                // but allow individual day overrides if needed. Here we just take day 0 as the reference.
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