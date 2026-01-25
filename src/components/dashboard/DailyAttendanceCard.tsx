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
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
           <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Today's Attendance
              </CardTitle>
              <CardDescription>{format(new Date(), 'EEEE, MMMM do')}</CardDescription>
           </div>
           {stats.total > 0 && (
             <Button variant="ghost" size="sm" asChild className="h-8">
               <Link to="/classes">View Classes</Link>
             </Button>
           )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-20 flex items-center justify-center text-muted-foreground">
             Loading...
          </div>
        ) : stats.total === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
             <p>No attendance marked today.</p>
             <Button variant="link" size="sm" asChild>
                <Link to="/classes">Go to Classes to mark</Link>
             </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-2">
             <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                <Check className="h-4 w-4 text-green-600 mb-1" />
                <span className="font-bold text-lg">{stats.present}</span>
                <span className="text-[10px] uppercase text-muted-foreground">Present</span>
             </div>
             <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                <X className="h-4 w-4 text-red-600 mb-1" />
                <span className="font-bold text-lg">{stats.absent}</span>
                <span className="text-[10px] uppercase text-muted-foreground">Absent</span>
             </div>
             <div className="flex flex-col items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-md">
                <Clock className="h-4 w-4 text-orange-600 mb-1" />
                <span className="font-bold text-lg">{stats.late}</span>
                <span className="text-[10px] uppercase text-muted-foreground">Late</span>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};