import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, Clock } from "lucide-react";
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export const TimetableSettings = () => {
  const { timetable, updateEntry, clearEntry } = useTimetable();
  const { classes } = useClasses();
  const { savedSubjects } = useSettings();

  // Helper to find entry
  const getEntry = (day: string, period: number) => 
    timetable.find(t => t.day === day && t.period === period);

  const handleUpdate = (day: string, period: number, field: string, value: string) => {
    const current = getEntry(day, period);
    
    // If selecting a class, auto-fill subject/grade if empty
    if (field === 'class_id') {
       const cls = classes.find(c => c.id === value);
       if (cls) {
           updateEntry({
               day, period,
               class_id: cls.id,
               class_name: cls.className,
               subject: current?.subject || cls.subject,
               // Keep existing times if any
               start_time: current?.start_time,
               end_time: current?.end_time
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
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>My Timetable</CardTitle>
        </div>
        <CardDescription>Configure your weekly class schedule for quick access on the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] text-center">Period</TableHead>
                        {DAYS.map(day => <TableHead key={day} className="min-w-[200px] text-center">{day}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {PERIODS.map(period => (
                        <TableRow key={period}>
                            <TableCell className="font-bold text-center bg-muted/30">{period}</TableCell>
                            {DAYS.map(day => {
                                const entry = getEntry(day, period);
                                return (
                                    <TableCell key={`${day}-${period}`} className="p-2 align-top border-l">
                                        <div className="flex flex-col gap-1.5">
                                            {/* Class Selector / Input */}
                                            <Select 
                                                value={entry?.class_id || (entry?.class_name ? "custom" : "")} 
                                                onValueChange={(val) => {
                                                    if (val === "custom") return; // Handled by text input fallback if we implemented it, or just use text input
                                                    if (val === "clear") { clearEntry(day, period); return; }
                                                    handleUpdate(day, period, 'class_id', val);
                                                }}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Select Class" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="clear" className="text-muted-foreground italic">-- Clear Slot --</SelectItem>
                                                    {classes.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                                                    ))}
                                                    <SelectItem value="custom" disabled>Custom / Free Period</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* Subject Input */}
                                            <Input 
                                                placeholder="Subject" 
                                                className="h-6 text-xs" 
                                                value={entry?.subject || ''}
                                                onChange={(e) => handleUpdate(day, period, 'subject', e.target.value)}
                                            />

                                            {/* Optional Custom Class Name if not linked */}
                                            {!entry?.class_id && (
                                                <Input 
                                                    placeholder="Class/Grade" 
                                                    className="h-6 text-xs"
                                                    value={entry?.class_name || ''}
                                                    onChange={(e) => handleUpdate(day, period, 'class_name', e.target.value)}
                                                />
                                            )}
                                            
                                            {/* Time Range (Optional) */}
                                            {/* Could hide this behind a toggle or make it very small */}
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