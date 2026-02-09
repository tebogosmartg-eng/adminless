import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, Clock, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDailyAttendance } from '@/hooks/useDailyAttendance';

export const DailyAttendanceCard = () => {
  const { stats, loading } = useDailyAttendance();

  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <div className="flex justify-between items-start">
           <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Attendance
              </CardTitle>
              <CardDescription className="text-[10px] font-medium uppercase">{format(new Date(), 'EEEE, dd/MM')}</CardDescription>
           </div>
           {stats.total > 0 && (
             <Button variant="ghost" size="sm" asChild className="h-7 text-[10px] font-bold uppercase">
               <Link to="/classes">Classes</Link>
             </Button>
           )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="h-16 flex items-center justify-center text-muted-foreground opacity-30">
             <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : stats.total === 0 ? (
          <div className="py-4 text-center text-[11px] text-muted-foreground">
             <p>Not marked today.</p>
             <Button variant="link" size="sm" asChild className="h-auto p-0 text-[10px]">
                <Link to="/classes">Go to Classes</Link>
             </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
             <div className="flex flex-col items-center p-1.5 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100/50">
                <Check className="h-3.5 w-3.5 text-green-600 mb-0.5" />
                <span className="font-black text-sm">{stats.present}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground/60">Present</span>
             </div>
             <div className="flex flex-col items-center p-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100/50">
                <X className="h-3.5 w-3.5 text-red-600 mb-0.5" />
                <span className="font-black text-sm">{stats.absent}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground/60">Absent</span>
             </div>
             <div className="flex flex-col items-center p-1.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100/50">
                <Clock className="h-3.5 w-3.5 text-orange-600 mb-0.5" />
                <span className="font-black text-sm">{stats.late}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground/60">Late</span>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { Loader2 } from 'lucide-react';