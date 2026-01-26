import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, Clock, AlertCircle, Save, Loader2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Learner } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAttendance } from '@/hooks/useAttendance';

interface AttendanceViewProps {
  classId: string;
  learners: Learner[];
}

export const AttendanceView = ({ classId, learners }: AttendanceViewProps) => {
  const {
    date, setDate,
    attendanceData,
    loading,
    saving,
    hasChanges,
    isExporting,
    stats,
    handleStatusChange,
    handleMarkAll,
    saveAttendance,
    handleExportReport
  } = useAttendance(classId, learners);

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