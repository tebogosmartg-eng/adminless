import RecentActivity from './RecentActivity';
import { ClassInfo, Learner } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, LayoutDashboard, Settings, CalendarClock, ShieldCheck } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';
import { QuickActions } from './QuickActions';
import { TermProgressWidget } from './TermProgressWidget';
import { TimetableWidget } from './TimetableWidget';
import { TodoList } from './TodoList';
import { AdminDebtWidget } from './AdminDebtWidget';
import { DailyGoalWidget } from './DailyGoalWidget';
import { OnboardingChecklist } from './OnboardingChecklist';
import { RecentAlerts } from './RecentAlerts';
import { DailyAttendanceCard } from './DailyAttendanceCard';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <OnboardingChecklist />

      <div className="grid gap-6 md:grid-cols-3">
         <div className="md:col-span-2">
            <QuickActions onAddNote={onAddNote} />
         </div>
         <div className="space-y-6">
            <TermProgressWidget />
            <DailyGoalWidget />
         </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informational Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          <AdminDebtWidget />
          
          <div className="grid gap-6 sm:grid-cols-2">
              <DailyAttendanceCard />
              <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Class Roster Access
                    </CardTitle>
                    <CardDescription>Quick navigation to your active class lists.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="grid gap-2">
                        {activeClasses.slice(0, 4).map(c => (
                            <Button key={c.id} variant="outline" className="justify-start text-xs font-medium h-9" asChild>
                                <Link to={`/classes/${c.id}`}>
                                    {c.className} • {c.subject}
                                </Link>
                            </Button>
                        ))}
                        {activeClasses.length > 4 && (
                            <Button variant="link" size="sm" asChild className="text-[10px] uppercase font-bold text-muted-foreground">
                                <Link to="/classes">View all classes</Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
              </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <LayoutDashboard className="h-3 w-3" /> 
                Administrative Context
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
                {activeClasses.map(c => (
                <ClassSummaryCard key={c.id} classInfo={c} />
                ))}
            </div>
          </div>
        </div>

        {/* Schedule & Reminders Column */}
        <div className="space-y-6">
          <TimetableWidget />
          <TodoList />
          <RecentAlerts />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};