import RecentActivity from './RecentActivity';
import { ClassInfo, Learner } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, LayoutDashboard, Rocket, ShieldCheck, ChevronRight, Book, CheckCircle2, AlertCircle, Circle, Star } from 'lucide-react';
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
import { GetStartedChecklist } from './GetStartedChecklist';
import { useRemediation } from '@/hooks/useRemediation';
import { useAcademic } from '@/context/AcademicContext';
import { Progress } from '@/components/ui/progress';
import { useTeacherFileCompletion } from '@/hooks/useTeacherFileCompletion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DashboardOverviewTabProps {
  activeClasses: ClassInfo[];
  allActiveLearners: Learner[];
  totalClassesCount: number;
  onAddNote: () => void;
}

const PortfolioWidget = () => {
    const { activeTerm, activeYear } = useAcademic();
    const { stats, loading } = useTeacherFileCompletion(activeTerm?.id || '', activeYear?.id || '');

    if (!activeTerm || !activeYear || loading) return null;

    const missingRequired = stats.steps.filter((s: any) => !s.isComplete && s.type === 'required');

    return (
        <Card className="border-blue-200 bg-blue-50/20">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Book className="h-4 w-4 text-blue-600" />
                        Teacher File Status
                    </CardTitle>
                    <span className="text-[10px] font-black text-blue-700">{stats.percent}%</span>
                </div>
                <CardDescription className="text-[10px] uppercase font-bold text-blue-600/70">Audit Readiness Audit</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
                <Progress value={stats.percent} className="h-1.5 bg-blue-100" />
                
                <div className="space-y-1.5">
                    {missingRequired.slice(0, 2).map((step: any) => (
                        <div key={step.id} className="flex items-center gap-2 text-[10px] font-medium text-amber-700 bg-white/50 p-1.5 rounded border border-amber-100/50">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{step.label} pending</span>
                        </div>
                    ))}
                    {missingRequired.length === 0 && stats.percent > 0 && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-700 bg-green-50 p-1.5 rounded border border-green-100">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            Portfolio validated for moderation.
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1">
                    <p className="text-[9px] text-muted-foreground font-medium uppercase">
                        {stats.percent === 100 ? "Ready for finalisation" : "Awaiting documentation"}
                    </p>
                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-[10px] font-black uppercase text-blue-700">
                        <Link to="/teacher-file">Complete Portfolio <ChevronRight className="h-2.5 w-2.5 ml-1" /></Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const RemediationWidget = () => {
    const { activeTerm } = useAcademic();
    const { tasks, updateTaskStatus } = useRemediation('all', activeTerm?.id); 
    
    const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);

    if (tasks.length === 0) return null;

    return (
        <Card className="border-primary/20 bg-primary/[0.01]">
            <CardHeader className="pb-1.5 pt-3 px-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-primary" />
                        Pedagogical Actions
                    </CardTitle>
                    <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-primary/20">{tasks.length} total</Badge>
                </div>
                <CardDescription className="text-xs">Pending interventions from diagnostics.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
                <div className="space-y-1.5 mt-1">
                    {pendingTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-all group">
                            <button 
                                onClick={() => updateTaskStatus(task.id, 'completed')}
                                className="mt-0.5 h-4 w-4 rounded border border-primary/40 flex items-center justify-center hover:bg-primary/10 transition-colors"
                            >
                                <CheckCircle2 className="h-3 w-3 text-primary opacity-0 group-hover:opacity-40" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold leading-tight line-clamp-2">{task.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black uppercase text-primary/60">{task.title}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {tasks.length > 5 && (
                    <Button variant="link" size="sm" asChild className="w-full text-[9px] uppercase font-black text-muted-foreground h-6 mt-1">
                        <Link to="/classes">Manage all in Class View <ChevronRight className="h-2.5 w-2.5 ml-1" /></Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export const DashboardOverviewTab = ({ 
  activeClasses, 
  onAddNote
}: DashboardOverviewTabProps) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <GetStartedChecklist />
      
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
          <PortfolioWidget />
          <RemediationWidget />
          <TimetableWidget />
          <CurriculumProgressWidget />
          <div className="grid gap-3">
              <TodoList />
              <RecentAlerts />
          </div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};