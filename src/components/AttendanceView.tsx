import { useState, useEffect } from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAuthGuard } from '@/hooks/useAuthGuard';

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

const AttendanceViewContent = ({ classId, learners }: AttendanceViewProps) => {
  const { activeTerm } = useAcademic();
  const isLocked = !!activeTerm?.closed;

  const {
    date, setDate,
    attendanceData,
    safeLearners,
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
          "h-10 sm:h-8 px-2 transition-all",
          isSelected ? colorClass : "hover:bg-muted text-muted-foreground hover:text-foreground",
          !isSelected && "opacity-70 hover:opacity-100"
        )}
        onClick={() => lId && handleStatusChange(lId, status)}
        disabled={disabled || !lId}
        title={label}
      >
        <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    );
  };

  const isReady = !loading && safeLearners?.length > 0 && classId && activeTerm?.id;

  return (
    <div className="space-y-6 w-full">
      {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100 mb-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Attendance records for this term have been finalized and are currently read-only.</span>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border w-full">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))} className="shrink-0 h-10 w-10">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full sm:w-[240px] justify-start text-left font-normal flex-1", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{format(date, "dd/MM/yyyy")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} disabled={isSameDay(date, new Date())} className="shrink-0 h-10 w-10">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto text-sm">
             <div className="flex items-center justify-between sm:justify-start gap-3 md:gap-4 sm:mr-2 bg-background p-2 rounded-md border sm:border-none sm:bg-transparent">
                 <div className="flex items-center gap-1.5 text-green-600 font-medium"><Check className="h-4 w-4" /> <span>{stats.present}</span></div>
                 <div className="flex items-center gap-1.5 text-red-600 font-medium"><X className="h-4 w-4" /> <span>{stats.absent}</span></div>
                 <div className="flex items-center gap-1.5 text-orange-600 font-medium"><Clock className="h-4 w-4" /> <span>{stats.late}</span></div>
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
               {!isLocked && (
                   <Button onClick={saveAttendance} disabled={!hasChanges || saving || !isReady} size="sm" className="flex-1 sm:flex-none h-10 sm:h-9">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      <span className="hidden sm:inline">{hasChanges ? "Save Changes" : "Saved"}</span>
                      <span className="sm:hidden">Save</span>
                   </Button>
               )}

               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm" disabled={isExporting} className="flex-1 sm:flex-none h-10 sm:h-9">
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
        <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start sm:justify-center p-1 h-auto min-h-[48px] bg-muted/50 rounded-xl">
          <TabsTrigger value="daily" className="flex-none shrink-0 flex items-center gap-2 h-10 px-4">
            <ListChecks className="h-4 w-4 shrink-0" /> <span>Daily Register</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex-none shrink-0 flex items-center gap-2 h-10 px-4">
            <LayoutGrid className="h-4 w-4 shrink-0" /> <span>Monthly Grid</span>
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
                    <Button variant="ghost" size="sm" onClick={() => handleMarkAll('present')} disabled={!isReady} className="w-full sm:w-auto shrink-0 h-10 sm:h-9">
                        Mark All Present
                    </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 overflow-hidden">
              {loading ? (
                <div className="border-t sm:border rounded-md overflow-x-auto w-full p-4 space-y-4">
                    <div className="flex justify-between border-b pb-2">
                       <Skeleton className="h-4 w-12" />
                       <Skeleton className="h-4 w-32" />
                       <Skeleton className="h-4 w-32" />
                       <Skeleton className="h-4 w-20" />
                    </div>
                    {[1,2,3,4,5].map(i => (
                       <div key={i} className="flex justify-between items-center py-2">
                           <Skeleton className="h-4 w-8" />
                           <Skeleton className="h-4 w-40" />
                           <div className="flex gap-2">
                               <Skeleton className="h-8 w-8" />
                               <Skeleton className="h-8 w-8" />
                               <Skeleton className="h-8 w-8" />
                               <Skeleton className="h-8 w-8" />
                           </div>
                           <Skeleton className="h-6 w-16" />
                       </div>
                    ))}
                </div>
              ) : (
                <div className="border-t sm:border rounded-md overflow-x-auto w-full no-scrollbar">
                    <Table className="min-w-[500px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] pl-4">#</TableHead>
                                <TableHead className="w-[180px] sm:w-[250px] sticky left-0 bg-background z-10 border-r border-border shadow-sm">Learner Name</TableHead>
                                <TableHead className="text-center w-[200px]">Status</TableHead>
                                <TableHead className="text-right pr-4">Current State</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {safeLearners.map((learner, index) => (
                                <TableRow key={learner.id || index} className="h-14">
                                    <TableCell className="text-muted-foreground pl-4">{index + 1}</TableCell>
                                    <TableCell className="font-medium truncate max-w-[150px] sm:max-w-[200px] sticky left-0 bg-background z-10 border-r border-border shadow-sm">
                                      {learner.name}
                                      {!learner.id && <span className="ml-2 text-xs text-red-500">(Unsaved)</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1.5 sm:gap-1">
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
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={() => handleExportReport('pdf')} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <FileText className="h-4 w-4 sm:mr-2" />}
                            <span className="hidden sm:inline">Export Grid (PDF)</span>
                            <span className="sm:hidden">PDF</span>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={() => handleExportReport('csv')} disabled={isExporting}>
                            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </Button>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 overflow-hidden">
                 <MonthlyAttendanceGrid 
                    classId={classId} 
                    learners={safeLearners} 
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

export const AttendanceView = (props: AttendanceViewProps) => {
  const { user, authReady } = useAuthGuard();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
     const timer = setTimeout(() => {
        console.warn("Auth Guard Timeout Reached.");
        setTimeoutReached(true);
     }, 3000);
     return () => clearTimeout(timer);
  }, []);

  if (!authReady && !timeoutReached) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col w-full px-8 gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user && !timeoutReached) {
      return <div className="text-center py-10">Unauthorized</div>;
  }

  return <AttendanceViewContent {...props} />;
};