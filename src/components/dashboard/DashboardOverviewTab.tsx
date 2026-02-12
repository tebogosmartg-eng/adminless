import RecentActivity from './RecentActivity';
import { ClassInfo, Learner } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, LayoutDashboard } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';
import { QuickActions } from './QuickActions';
import { TermProgressWidget } from './TermProgressWidget';
import { DailyGoalWidget } from './DailyGoalWidget';
import { RecentAlerts } from './RecentAlerts';
import { DailyAttendanceCard } from './DailyAttendanceCard';
import { CurriculumProgressWidget } from './CurriculumProgressWidget';
import { TimetableWidget } from './TimetableWidget';
import { TodoList } from './TodoList';
import { AdminDebtWidget } from './AdminDebtWidget';

interface DashboardOverviewTabProps {
  activeClasses: ClassInfo[];
  allActiveLearners: Learner[];
  totalClassesCount: number;
  onAddNote: () => void;
}

export const DashboardOverviewTab = ({ 
  activeClasses, 
  onAddNote
}: DashboardOverviewTabProps) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="grid gap-3 md:grid-cols-3">
         <div className="md:col-span-2">
            <QuickActions onAddNote={onAddNote} />
         </div>
         <div className="space-y-3">
            <TermProgressWidget />
            <DailyGoalWidget />
         </div>
      </div>
      
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <AdminDebtWidget />
          
          <div className="grid gap-3 sm:grid-cols-2">
              <DailyAttendanceCard />
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Class Rosters
                    </CardTitle>
                    <CardDescription className="text-xs">Direct access to your current term groups.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3">
                    <div className="grid gap-1.5">
                        {activeClasses.slice(0, 4).map(c => (
                            <Button key={c.id} variant="outline" className="justify-start text-[11px] font-medium h-7" asChild>
                                <Link to={`/classes/${c.id}`}>
                                    {c.className} • {c.subject}
                                </Link>
                            </Button>
                        ))}
                        {activeClasses.length > 4 && (
                            <Button variant="link" size="sm" asChild className="text-[10px] uppercase font-bold text-muted-foreground h-5">
                                <Link to="/classes">View all classes</Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
              </Card>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <LayoutDashboard className="h-3 w-3" /> 
                Active Marksheets
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
                {activeClasses.map(c => (
                  <ClassSummaryCard key={c.id} classInfo={c} />
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <TimetableWidget />
          <CurriculumProgressWidget />
          <TodoList />
          <RecentAlerts />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};