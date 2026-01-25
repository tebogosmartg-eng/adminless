import { useState, useEffect, useMemo } from 'react';
import { format, addDays, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, Clock, AlertCircle, Save, Loader2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AttendanceViewProps {
  classId: string;
  learners: Learner[];
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  id?: string;
  learner_id: string;
  status: AttendanceStatus;
  date?: string; // Added for export logic
}

export const AttendanceView = ({ classId, learners }: AttendanceViewProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch attendance for selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', formattedDate);

      if (error) {
        console.error('Error fetching attendance:', error);
        showError('Failed to load attendance.');
      } else {
        const map: Record<string, AttendanceRecord> = {};
        data?.forEach((record: any) => {
          map[record.learner_id] = record;
        });
        setAttendanceData(map);
        setHasChanges(false);
      }
      setLoading(false);
    };

    fetchAttendance();
  }, [classId, date]);

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    // Only allow change if learner has an ID (database sync requirement)
    if (!learnerId) {
      showError("Cannot mark attendance: Learner ID missing. Please refresh or save class first.");
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], learner_id: learnerId, status }
    }));
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newData = { ...attendanceData };
    learners.forEach(l => {
      if (l.id) {
        newData[l.id] = { ...newData[l.id], learner_id: l.id, status };
      }
    });
    setAttendanceData(newData);
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    setSaving(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showError("Authentication error.");
        setSaving(false);
        return;
    }

    const upsertData = Object.values(attendanceData).map(record => ({
      class_id: classId,
      learner_id: record.learner_id,
      date: formattedDate,
      status: record.status,
      user_id: user.id
    }));

    if (upsertData.length === 0) {
        setSaving(false);
        return;
    }

    const { error } = await supabase
      .from('attendance')
      .upsert(upsertData, { onConflict: 'learner_id,date' });

    if (error) {
      console.error('Error saving attendance:', error);
      showError('Failed to save attendance.');
    } else {
      showSuccess('Attendance saved successfully.');
      setHasChanges(false);
    }
    setSaving(false);
  };

  const handleExportReport = async (type: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const formattedStart = format(start, 'yyyy-MM-dd');
      const formattedEnd = format(end, 'yyyy-MM-dd');

      // Fetch all attendance for this month
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .gte('date', formattedStart)
        .lte('date', formattedEnd)
        .order('date', { ascending: true });

      if (error) throw error;

      // Process data: Get unique dates
      const recordMap: Record<string, Record<string, string>> = {}; // learnerId -> date -> status
      const datesSet = new Set<string>();

      data?.forEach((record: any) => {
        if (!recordMap[record.learner_id]) recordMap[record.learner_id] = {};
        recordMap[record.learner_id][record.date] = record.status;
        datesSet.add(record.date);
      });

      const sortedDates = Array.from(datesSet).sort();
      
      if (sortedDates.length === 0) {
        showError("No attendance records found for this month.");
        setIsExporting(false);
        return;
      }

      if (type === 'csv') {
        let csv = 'Learner Name,' + sortedDates.join(',') + ',Present,Absent,Late\n';
        
        learners.forEach(l => {
          if (!l.id) return;
          const records = recordMap[l.id] || {};
          let row = `"${l.name}"`;
          let present = 0, absent = 0, late = 0;

          sortedDates.forEach(d => {
             const status = records[d] || '-';
             row += `,${status}`;
             if (status === 'present') present++;
             if (status === 'absent') absent++;
             if (status === 'late') late++;
          });
          
          row += `,${present},${absent},${late}\n`;
          csv += row;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Attendance_${format(date, 'MMM_yyyy')}.csv`;
        link.click();
        
      } else {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        doc.setFontSize(16);
        doc.text(`Attendance Register: ${format(date, 'MMMM yyyy')}`, 14, 15);
        
        const head = [['Name', ...sortedDates.map(d => format(new Date(d), 'dd')), 'P', 'A', 'L']];
        const body = learners.map(l => {
           if (!l.id) return [];
           const records = recordMap[l.id] || {};
           let present = 0, absent = 0, late = 0;
           
           const statuses = sortedDates.map(d => {
              const s = records[d];
              if (s === 'present') { present++; return 'P'; }
              if (s === 'absent') { absent++; return 'A'; }
              if (s === 'late') { late++; return 'L'; }
              if (s === 'excused') return 'E';
              return '-';
           });
           
           return [l.name, ...statuses, present, absent, late];
        }).filter(row => row.length > 0);

        autoTable(doc, {
          startY: 25,
          head: head,
          body: body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1 },
          headStyles: { fillColor: [41, 37, 36], textColor: 255 },
          columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } }
        });
        
        doc.save(`Attendance_${format(date, 'MMM_yyyy')}.pdf`);
      }

      showSuccess("Attendance report exported.");
    } catch (e) {
      console.error(e);
      showError("Failed to export attendance.");
    } finally {
      setIsExporting(false);
    }
  };

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    learners.forEach(l => {
      if (l.id && attendanceData[l.id]) {
        counts[attendanceData[l.id].status]++;
      } else {
        counts.unmarked++;
      }
    });
    return counts;
  }, [learners, attendanceData]);

  const StatusButton = ({ lId, status, icon: Icon, colorClass, label }: any) => {
    const isSelected = attendanceData[lId]?.status === status;
    return (
      <Button
        variant={isSelected ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-8 px-2 transition-all",
          isSelected ? colorClass : "hover:bg-muted text-muted-foreground hover:text-foreground",
          !isSelected && "opacity-70 hover:opacity-100"
        )}
        onClick={() => lId && handleStatusChange(lId, status)}
        disabled={!lId}
        title={label}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} disabled={isSameDay(date, new Date())}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
             <div className="flex items-center gap-4 mr-2 hidden md:flex">
                 <div className="flex items-center gap-1 text-green-600 font-medium"><Check className="h-4 w-4" /> {stats.present}</div>
                 <div className="flex items-center gap-1 text-red-600 font-medium"><X className="h-4 w-4" /> {stats.absent}</div>
                 <div className="flex items-center gap-1 text-orange-600 font-medium"><Clock className="h-4 w-4" /> {stats.late}</div>
             </div>
             
             <Button onClick={saveAttendance} disabled={!hasChanges || saving} size="sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {hasChanges ? "Save Changes" : "Saved"}
             </Button>

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm" disabled={isExporting}>
                      <Download className="h-4 w-4 md:mr-2" /> 
                      <span className="hidden md:inline">Export</span>
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => handleExportReport('csv')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Monthly CSV
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleExportReport('pdf')}>
                      <FileText className="mr-2 h-4 w-4" /> Monthly PDF
                   </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
           <div className="flex justify-between items-center">
              <CardTitle>Daily Register</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => handleMarkAll('present')}>
                 Mark All Present
              </Button>
           </div>
           <CardDescription>
              Record attendance for {format(date, 'MMMM do')}.
           </CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
           ) : (
             <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Learner Name</TableHead>
                            <TableHead className="text-center w-[200px]">Status</TableHead>
                            <TableHead className="text-right">Current State</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {learners.map((learner, index) => (
                            <TableRow key={learner.id || index}>
                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                   {learner.name}
                                   {!learner.id && <span className="ml-2 text-xs text-red-500">(Unsaved)</span>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-1">
                                        <StatusButton lId={learner.id} status="present" icon={Check} colorClass="bg-green-600 hover:bg-green-700" label="Present" />
                                        <StatusButton lId={learner.id} status="absent" icon={X} colorClass="bg-red-600 hover:bg-red-700" label="Absent" />
                                        <StatusButton lId={learner.id} status="late" icon={Clock} colorClass="bg-orange-500 hover:bg-orange-600" label="Late" />
                                        <StatusButton lId={learner.id} status="excused" icon={AlertCircle} colorClass="bg-blue-500 hover:bg-blue-600" label="Excused" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {learner.id && attendanceData[learner.id] ? (
                                        <Badge variant="outline" className={cn(
                                            "capitalize",
                                            attendanceData[learner.id].status === 'present' && "border-green-200 bg-green-50 text-green-700",
                                            attendanceData[learner.id].status === 'absent' && "border-red-200 bg-red-50 text-red-700",
                                            attendanceData[learner.id].status === 'late' && "border-orange-200 bg-orange-50 text-orange-700",
                                            attendanceData[learner.id].status === 'excused' && "border-blue-200 bg-blue-50 text-blue-700",
                                        )}>
                                            {attendanceData[learner.id].status}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs italic">Unmarked</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
};