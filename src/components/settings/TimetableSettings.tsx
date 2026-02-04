import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NotebookPen, BookOpen } from "lucide-react";
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
        <CardDescription>Plan your weekly routine by setting your classes and subjects for each session.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-background">
            <Table className="table-fixed w-full min-w-[1000px]">
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[80px] text-center border-r font-bold">Session</TableHead>
                        {DAYS.map(day => <TableHead key={day} className="text-center font-bold">{day}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {PERIODS.map(period => (
                        <TableRow key={period} className="h-28">
                            <TableCell className="font-black text-center bg-muted/20 border-r text-muted-foreground">
                                {period}
                            </TableCell>
                            {DAYS.map(day => {
                                const entry = getEntry(day, period);
                                return (
                                    <TableCell key={`${day}-${period}`} className="p-3 align-top border-l relative group">
                                        <div className="flex flex-col gap-2 h-full justify-center">
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
                                                    placeholder="Subject context..." 
                                                    className="h-8 text-[11px] pl-6 border-muted bg-transparent focus-visible:ring-primary/30" 
                                                    value={entry?.subject || ''}
                                                    onChange={(e) => handleUpdate(day, period, 'subject', e.target.value)}
                                                />
                                            </div>

                                            {!entry?.class_id && entry?.class_name && (
                                                <p className="text-[9px] font-bold text-primary/70 absolute bottom-2 left-3">
                                                    {entry.class_name}
                                                </p>
                                            )}
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