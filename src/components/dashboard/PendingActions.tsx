import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClassInfo } from '@/lib/types';
import { usePendingAttendance } from '@/hooks/usePendingAttendance';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingActionsProps {
  classes: ClassInfo[];
}

export const PendingActions = ({ classes }: PendingActionsProps) => {
  const { pendingClasses, loading } = usePendingAttendance(classes);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Action Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingClasses.length === 0) {
    return (
      <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg text-green-700 dark:text-green-400">All Caught Up</CardTitle>
          </div>
          <CardDescription>Attendance has been marked for all active classes today.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Pending Attendance</CardTitle>
        </div>
        <CardDescription>
          {pendingClasses.length} class{pendingClasses.length !== 1 ? 'es' : ''} need attendance for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pendingClasses.slice(0, 3).map((cls) => (
            <div key={cls.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{cls.className}</span>
                <span className="text-xs text-muted-foreground">{cls.subject}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-primary" asChild>
                <Link to={`/classes/${cls.id}`}>
                  Mark <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
          
          {pendingClasses.length > 3 && (
             <p className="text-xs text-center text-muted-foreground pt-1">
               + {pendingClasses.length - 3} more classes
             </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};