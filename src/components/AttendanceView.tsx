import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, Clock, AlertCircle, Save, Loader2, Download, FileSpreadsheet, FileText, LucideIcon, LayoutGrid, ListChecks, Lock } from 'lucide-react';
import { Learner, AttendanceStatus } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAttendance } from '@/hooks/useAttendance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyAttendanceGrid } from './MonthlyAttendanceGrid';
import { useAcademic } from '@/context/AcademicContext';

interface AttendanceViewProps {
  classId: string;
  learners: Learner[];
}

interface StatusButtonProps {
  lId?: string;
  status: AttendanceStatus;
  icon: LucideIcon;
  colorClass: string;
  label: string;
  disabled?: boolean;
}

export const AttendanceView = ({ classId, learners }: AttendanceViewProps) => {
  const { activeTerm } = useAcademic();
  const isLocked = !!activeTerm?.closed;

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

  const StatusButton = ({ lId, status, icon: Icon, colorClass, label, disabled }: StatusButtonProps) => {
    const isSelected = lId ? attendanceData[lId]?.status === status : false;
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
        disabled={disabled || !lId}
        title={label}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100 mb-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Attendance records for this term have been finalized and are currently read-only.</span>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border w-full">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))} className="shrink-0">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal flex-1", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{format(date, "dd/MM/yyyy")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} disabled={isSameDay(date, new Date())} className="shrink-0">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto text-sm">
             <div className="flex flex-wrap items-center gap-3 md:gap-4 mr-2">
                 <div className="flex items-center gap-1 text-green-600 font-medium"><Check className="h-4 w-4" /> <span className="hidden sm:inline">{stats.present}</span></div>
                 <div className="flex items-center gap-1 text-red-600 font-medium"><X className="h-4 w-4" /> <span className="hidden sm:inline">{stats.absent}</span></div>
                 <div className="flex items-center gap-1 text-orange-600 font-medium"><Clock className="h-4 w-4" /> <span className="hidden sm:inline">{stats.late}</span></div>
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
               {!isLocked && (
                   <Button onClick={saveAttendance} disabled={!hasChanges || saving} size="sm" className="flex-1 sm:flex-none">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      <span className="hidden sm:inline">{hasChanges ? "Save Changes" : "Saved"}</span>
                      <span className="sm:hidden">Save</span>
                   </Button>
               )}

               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm" disabled={isExporting} className="flex-1 sm:flex-none">
                        <Download className="h-4 w-4 sm:mr-2" /> 
                        <span className="hidden sm:inline">Export</span>
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
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0" /> <span className="truncate">Daily Register</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 shrink-0" /> <span className="truncate">Monthly Grid</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">Daily Register</CardTitle>
                    <CardDescription className="truncate">
                        Record attendance for {format(date, 'EEEE, dd MMMM yyyy')}.
                    </CardDescription>
                  </div>
                  {!isLocked && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkAll('present')} className="w-full sm:w-auto shrink-0">
                        Mark All Present
                    </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="border-t sm:border rounded-md overflow-x-auto w-full">
                    <Table className="min-w-[500px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] pl-4">#</TableHead>
                                <TableHead>Learner Name</TableHead>
                                <TableHead className="text-center w-[200px]">Status</TableHead>
                                <TableHead className="text-right pr-4">Current State</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {learners.map((learner, index) => (
                                <TableRow key={learner.id || index}>
                                    <TableCell className="text-muted-foreground pl-4">{index + 1}</TableCell>
                                    <TableCell className="font-medium truncate max-w-[150px]">
                                      {learner.name}
                                      {!learner.id && <span className="ml-2 text-xs text-red-500">(Unsaved)</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1">
                                            <StatusButton lId={learner.id} status="present" icon={Check} colorClass="bg-green-600 hover:bg-green-700" label="Present" disabled={isLocked} />
                                            <StatusButton lId={learner.id} status="absent" icon={X} colorClass="bg-red-600 hover:bg-red-700" label="Absent" disabled={isLocked} />
                                            <StatusButton lId={learner.id} status="late" icon={Clock} colorClass="bg-orange-500 hover:bg-orange-600" label="Late" disabled={isLocked} />
                                            <StatusButton lId={learner.id} status="excused" icon={AlertCircle} colorClass="bg-blue-500 hover:bg-blue-600" label="Excused" disabled={isLocked} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
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
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
           <Card>
              <CardHeader className="pb-2">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="truncate">Monthly Overview</CardTitle>
                        <CardDescription className="truncate">
                            Viewing records for {format(date, 'MMMM yyyy')}.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleExportReport('pdf')} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <FileText className="h-3 w-3 sm:mr-2" />}
                            <span className="hidden sm:inline">Export Grid (PDF)</span>
                            <span className="sm:hidden">PDF</span>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleExportReport('csv')} disabled={isExporting}>
                            <FileSpreadsheet className="h-3 w-3 sm:mr-2" />
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </Button>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 overflow-hidden">
                 <MonthlyAttendanceGrid 
                    classId={classId} 
                    learners={learners} 
                    currentDate={date} 
                    onDayClick={setDate}
                 />
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};