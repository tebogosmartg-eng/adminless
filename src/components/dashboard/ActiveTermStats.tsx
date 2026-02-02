import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAcademic } from '@/context/AcademicContext';
import { Loader2, TrendingUp, AlertCircle, CalendarClock, Info } from 'lucide-react';
import { db } from '@/db';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const ActiveTermStats = () => {
  const { activeTerm, activeYear } = useAcademic();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ avg: number; passRate: number; assessmentsCount: number; isWeightValid: boolean; totalWeight: number } | null>(null);

  useEffect(() => {
    if (!activeTerm) return;

    const fetchTermStats = async () => {
        setLoading(true);
        try {
            // 1. Get assessments for this term from Local DB
            const assessments = await db.assessments
                .where('term_id')
                .equals(activeTerm.id)
                .toArray();
            
            const totalWeight = assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
            const isWeightValid = totalWeight === 100 || assessments.length === 0;

            if (!assessments || assessments.length === 0) {
                setStats({ avg: 0, passRate: 0, assessmentsCount: 0, isWeightValid: true, totalWeight: 0 });
                setLoading(false);
                return;
            }

            const assessmentIds = assessments.map(a => a.id);

            // 2. Get marks from Local DB
            const marks = await db.assessment_marks
                .where('assessment_id')
                .anyOf(assessmentIds)
                .toArray();

            if (marks.length === 0) {
                setStats({ avg: 0, passRate: 0, assessmentsCount: assessments.length, isWeightValid, totalWeight });
                setLoading(false);
                return;
            }

            // 3. Calculate Global Average for Term
            let totalPercentage = 0;
            let count = 0;
            let passCount = 0;

            marks.forEach(m => {
                const ass = assessments.find(a => a.id === m.assessment_id);
                if (ass && m.score !== null) {
                    const pct = (Number(m.score) / Number(ass.max_mark)) * 100;
                    totalPercentage += pct;
                    if (pct >= 50) passCount++;
                    count++;
                }
            });

            const avg = count > 0 ? Math.round(totalPercentage / count) : 0;
            const passRate = count > 0 ? Math.round((passCount / count) * 100) : 0;

            setStats({ avg, passRate, assessmentsCount: assessments.length, isWeightValid, totalWeight });
        } catch (error) {
            console.error("Failed to load term stats", error);
        } finally {
            setLoading(false);
        }
    };

    fetchTermStats();
  }, [activeTerm]);

  if (!activeYear || !activeTerm) {
      return (
        <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <CalendarClock className="h-10 w-10 text-muted-foreground opacity-50" />
                <h3 className="font-semibold">No Active Term</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                    Configure your academic year and terms to see stats.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link to="/settings">Go to Settings</Link>
                </Button>
            </CardContent>
        </Card>
      );
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg font-bold text-primary">{activeTerm.name} Overview</CardTitle>
                <CardDescription>Current Term Performance ({activeYear.name})</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {stats && !stats.isWeightValid && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="bg-amber-100 p-1 rounded-full cursor-help">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Weighting error: Current total is {stats.totalWeight}% (should be 100%).</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                <TrendingUp className="h-5 w-5 text-primary" />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex py-4 justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div>
        ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold">{stats?.avg}%</div>
                    <div className="text-xs text-muted-foreground">Avg. Performance</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats?.passRate}%</div>
                    <div className="text-xs text-muted-foreground">Pass Rate</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats?.assessmentsCount}</div>
                    <div className="text-xs text-muted-foreground">Assessments</div>
                </div>
            </div>
        )}
        {!loading && stats?.assessmentsCount === 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                No assessments created for this term yet.
            </div>
        )}
        {!loading && stats && !stats.isWeightValid && stats.assessmentsCount > 0 && (
            <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-100 p-2 rounded-md">
                <p className="text-[10px] text-amber-800 leading-tight">
                    <strong>Warning:</strong> Incomplete weighting ({stats.totalWeight}%). Term averages may be inaccurate.
                </p>
                <Button variant="link" className="h-auto p-0 text-[10px] text-amber-900 font-bold" asChild>
                    <Link to="/classes">Fix in Classes</Link>
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};