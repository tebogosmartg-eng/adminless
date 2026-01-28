import { format, isWeekend, isSameDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Learner } from '@/lib/types';
import { useMonthlyAttendance } from '@/hooks/useMonthlyAttendance';
import { Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyAttendanceGridProps {
  classId: string;
  learners: Learner[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

export const MonthlyAttendanceGrid = ({ classId, learners, currentDate, onDayClick }: MonthlyAttendanceGridProps) => {
  const { days, loading, getStatus } = useMonthlyAttendance(classId, currentDate);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

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
      case 'present': return 'bg-green-50 hover:bg-green-100';
      case 'absent': return 'bg-red-50 hover:bg-red-100';
      case 'late': return 'bg-orange-50 hover:bg-orange-100';
      case 'excused': return 'bg-blue-50 hover:bg-blue-100';
      default: return 'hover:bg-muted/50';
    }
  };

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Learner</TableHead>
            {days.map((day) => (
              <TableHead 
                key={day.toString()} 
                className={cn(
                  "px-1 text-center min-w-[30px] cursor-pointer hover:bg-muted transition-colors",
                  isWeekend(day) && "bg-muted/30 text-muted-foreground",
                  isSameDay(day, new Date()) && "text-primary font-bold bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className="flex flex-col items-center justify-center text-[10px] leading-tight py-1">
                  <span>{format(day, 'EEE')}</span>
                  <span className="font-semibold">{format(day, 'd')}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((learner) => (
            <TableRow key={learner.id || learner.name}>
              <TableCell className="font-medium text-sm sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[150px]" title={learner.name}>
                {learner.name}
              </TableCell>
              {days.map((day) => {
                const status = learner.id ? getStatus(learner.id, day) : null;
                const isWknd = isWeekend(day);
                
                return (
                  <TableCell 
                    key={day.toString()} 
                    className={cn(
                      "p-0 text-center border-l", 
                      isWknd ? "bg-muted/10" : "",
                      getStatusClass(status)
                    )}
                  >
                    <div className="h-8 flex items-center justify-center">
                        {status ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full h-full flex items-center justify-center cursor-default">
                                        {getStatusIcon(status)}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="capitalize">{status} - {format(day, 'MMM d')}</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <span className="text-[8px] text-muted-foreground/20">•</span>
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
  );
};