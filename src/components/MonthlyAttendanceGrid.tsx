import { format, isWeekend, isSameDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Learner, AttendanceStatus } from '@/lib/types';
import { useMonthlyAttendance } from '@/hooks/useMonthlyAttendance';
import { Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MonthlyAttendanceGridProps {
  classId: string;
  learners: Learner[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

export const MonthlyAttendanceGrid = ({ classId, learners, currentDate, onDayClick }: MonthlyAttendanceGridProps) => {
  const { days, loading, getStatus, updateStatus, records } = useMonthlyAttendance(classId, currentDate);

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

  // Calculate monthly stats per row
  const rowStats = useMemo(() => {
    if (!records) return {};
    const stats: Record<string, { present: number; absent: number; late: number }> = {};
    
    learners.forEach(l => {
      if (!l.id) return;
      const lRecs = records.filter(r => r.learner_id === l.id);
      stats[l.id] = {
        present: lRecs.filter(r => r.status === 'present').length,
        absent: lRecs.filter(r => r.status === 'absent').length,
        late: lRecs.filter(r => r.status === 'late').length
      };
    });
    return stats;
  }, [records, learners]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>;
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
                  isSameDay(day, new Date()) && "text-primary font-bold bg-primary/5"
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
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-red-600 bg-red-50/50 sticky right-[40px] z-10 border-l">A</TableHead>
            <TableHead className="w-[40px] text-center text-[9px] font-bold text-orange-600 bg-orange-50/50 sticky right-0 z-10 border-l">L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((learner) => {
            const stats = learner.id ? rowStats[learner.id] : null;
            
            return (
              <TableRow key={learner.id || learner.name} className="group hover:bg-muted/20">
                <TableCell 
                    className="font-medium text-sm sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[180px] py-2" 
                    title={learner.name}
                >
                  {learner.name}
                </TableCell>
                {days.map((day) => {
                  const status = learner.id ? getStatus(learner.id, day) : null;
                  const isWknd = isWeekend(day);
                  
                  return (
                    <TableCell 
                      key={day.toString()} 
                      className={cn(
                        "p-0 text-center border-r transition-colors cursor-pointer relative", 
                        isWknd ? "bg-muted/10" : "bg-transparent",
                        getStatusClass(status)
                      )}
                      onClick={() => learner.id && updateStatus(learner.id, day, status as AttendanceStatus)}
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
                <TableCell className="bg-green-50/30 text-center text-xs font-bold text-green-700 sticky right-[80px] z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {stats?.present || 0}
                </TableCell>
                <TableCell className="bg-red-50/30 text-center text-xs font-bold text-red-700 sticky right-[40px] z-10 border-l">
                    {stats?.absent || 0}
                </TableCell>
                <TableCell className="bg-orange-50/30 text-center text-xs font-bold text-orange-700 sticky right-0 z-10 border-l">
                    {stats?.late || 0}
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
          <span className="ml-auto font-bold uppercase tracking-tighter">Click cell to cycle status</span>
      </div>
    </div>
  );
};