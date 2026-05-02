import { format, isWeekend, isSameDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Learner, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import { useMonthlyAttendance } from '@/hooks/useMonthlyAttendance';
import { Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyAttendanceGridProps {
  classId: string;
  learners: Learner[];
  currentDate: Date;
  attendanceData: Record<string, AttendanceRecord>;
  onStatusChange: (learnerId: string, status: AttendanceStatus, targetDate?: Date) => void;
  onDayClick: (date: Date) => void;
  isLocked?: boolean;
}

export const MonthlyAttendanceGrid = ({
  classId,
  learners,
  currentDate,
  attendanceData,
  onStatusChange,
  onDayClick,
  isLocked = false
}: MonthlyAttendanceGridProps) => {
  const { days, loading, updateStatus, records } = useMonthlyAttendance(
    classId,
    currentDate,
    attendanceData,
    onStatusChange,
    isLocked
  );

  const buildGrid = (
    learnersList: Learner[],
    dayList: Date[],
    attendanceRecords: AttendanceRecord[]
  ) => {
    const statusByLearnerAndDay = new Map<string, AttendanceStatus>();
    attendanceRecords.forEach((record) => {
      statusByLearnerAndDay.set(`${record.learner_id}|${record.date}`, record.status);
    });

    const rows = learnersList.map((learner) => {
      const dayStatuses = dayList.map((day) => {
        if (!learner.id) return null;
        const dateKey = format(day, "yyyy-MM-dd");
        return statusByLearnerAndDay.get(`${learner.id}|${dateKey}`) ?? null;
      });

      const stats = dayStatuses.reduce(
        (acc, status) => {
          if (status === "present") acc.present += 1;
          if (status === "absent") acc.absent += 1;
          if (status === "late") acc.late += 1;
          if (status === "excused") acc.excused += 1;
          return acc;
        },
        { present: 0, absent: 0, late: 0, excused: 0 }
      );

      return { learner, dayStatuses, stats };
    });

    return { rows };
  };

  const getStatusIcon = (status: string | undefined | null) => {
    switch (status) {
      case 'present': return <Check className="h-3 w-3 text-green-600" />;
      case 'absent': return <X className="h-3 w-3 text-red-600" />;
      case 'late': return <Clock className="h-3 w-3 text-orange-500" />;
      case 'excused': return <AlertCircle className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusClass = (status: string | undefined | null) => {
    switch (status) {
      case 'present': return 'bg-green-50 hover:bg-green-100/80';
      case 'absent': return 'bg-red-50 hover:bg-red-100/80';
      case 'late': return 'bg-orange-50 hover:bg-orange-100/80';
      case 'excused': return 'bg-blue-50 hover:bg-blue-100/80';
      default: return 'hover:bg-muted/50';
    }
  };

  const today = useMemo(() => new Date(), []);

  // Build a month grid once per data change.
  const grid = useMemo(() => buildGrid(learners, days, records), [learners, days, records]);

  if (loading) {
    const skeletonDayCount = Math.min(days.length || 28, 31);
    const skeletonRowCount = learners.length > 0 ? Math.min(learners.length, 8) : 6;
    return (
      <div
        className="border rounded-md overflow-x-auto bg-background w-full max-w-[calc(100vw-2.5rem)] md:max-w-full min-h-[280px]"
        aria-busy
      >
        <Table className="border-collapse table-fixed w-full min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[180px] sticky left-0 bg-background z-20 border-r">
                <Skeleton className="h-4 w-16 mx-auto" />
              </TableHead>
              {Array.from({ length: skeletonDayCount }).map((_, i) => (
                <TableHead key={i} className="px-0 min-w-[32px] border-r">
                  <Skeleton className="h-6 w-5 mx-auto rounded" />
                </TableHead>
              ))}
              <TableHead className="w-[40px]" />
              <TableHead className="w-[40px]" />
              <TableHead className="w-[40px]" />
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
              <TableRow key={`monthly-sk-${rowIdx}`}>
                <TableCell className="sticky left-0 bg-background z-10 border-r py-2">
                  <Skeleton className="h-4 w-[85%]" />
                </TableCell>
                {Array.from({ length: skeletonDayCount }).map((_, i) => (
                  <TableCell key={i} className="p-1 border-r">
                    <Skeleton className="h-7 w-full rounded-sm" />
                  </TableCell>
                ))}
                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-center gap-2 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Loading attendance…
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto bg-background w-full no-scrollbar max-w-[calc(100vw-2.5rem)] md:max-w-full">
      <Table className="border-collapse table-fixed w-full min-w-[800px]">
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[180px] sticky left-0 bg-background z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-bold text-xs uppercase">
                Learner
            </TableHead>
            {days.map((day) => (
              <TableHead 
                key={day.toString()} 
                className={cn(
                  "px-0 text-center min-w-[32px] cursor-pointer hover:bg-muted transition-colors border-r",
                  isWeekend(day) && "bg-muted/30 text-muted-foreground",
                  isSameDay(day, today) && "text-primary font-bold bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className="flex flex-col items-center justify-center text-[9px] leading-tight py-1 font-black uppercase tracking-tighter">
                  <span>{format(day, 'EEE')}</span>
                  <span className="text-xs">{format(day, 'd')}</span>
                </div>
              </TableHead>
            ))}
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-green-600 bg-green-50/50 sticky right-[80px] z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">P</TableHead>
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-red-600 bg-red-50/50 sticky right-[80px] z-10 border-l">A</TableHead>
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-orange-600 bg-orange-50/50 sticky right-[40px] z-10 border-l">L</TableHead>
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-blue-600 bg-blue-50/50 sticky right-0 z-10 border-l">E</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grid.rows.map(({ learner, dayStatuses, stats }) => {
            return (
              <TableRow key={learner.id || learner.name} className="group hover:bg-muted/20">
                <TableCell 
                    className="font-medium text-sm sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[180px] py-2" 
                    title={learner.name}
                >
                  {learner.name}
                </TableCell>
                {days.map((day, dayIndex) => {
                  const status = dayStatuses[dayIndex];
                  const isWknd = isWeekend(day);
                  
                  return (
                    <TableCell 
                      key={day.toString()} 
                      className={cn(
                        "p-0 text-center border-r transition-colors cursor-pointer relative", 
                        isWknd ? "bg-muted/10" : "bg-transparent",
                        getStatusClass(status),
                        isLocked && "cursor-not-allowed opacity-70"
                      )}
                      onClick={() => learner.id && !isLocked && updateStatus(learner.id, day, status)}
                    >
                      <div className="h-9 flex items-center justify-center">
                          {status ? (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="w-full h-full flex items-center justify-center">
                                          {getStatusIcon(status)}
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="capitalize font-bold">{status}</p>
                                      <p className="text-[10px] opacity-70">{format(day, 'EEEE, MMM d')}</p>
                                  </TooltipContent>
                              </Tooltip>
                          ) : (
                              <span className="text-[10px] text-muted-foreground/10 group-hover:text-muted-foreground/30 transition-colors">
                                {isWknd ? '' : '•'}
                              </span>
                          )}
                      </div>
                    </TableCell>
                  );
                })}
                <TableCell className="bg-green-50/30 text-center text-xs font-bold text-green-700 sticky right-[120px] z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {stats.present}
                </TableCell>
                <TableCell className="bg-red-50/30 text-center text-xs font-bold text-red-700 sticky right-[80px] z-10 border-l">
                    {stats.absent}
                </TableCell>
                <TableCell className="bg-orange-50/30 text-center text-xs font-bold text-orange-700 sticky right-[40px] z-10 border-l">
                    {stats.late}
                </TableCell>
                <TableCell className="bg-blue-50/30 text-center text-xs font-bold text-blue-700 sticky right-0 z-10 border-l">
                    {stats.excused}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="p-2 bg-muted/10 border-t text-[10px] text-muted-foreground italic flex items-center gap-4">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Present</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Absent</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Late</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Excused</div>
          <span className="ml-auto font-bold uppercase tracking-tighter">
            {isLocked ? "Term finalised - grid is read-only" : "Click cell to cycle status"}
          </span>
      </div>
    </div>
  );
};