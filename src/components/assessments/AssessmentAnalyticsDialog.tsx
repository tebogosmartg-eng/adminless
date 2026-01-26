import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Assessment, AssessmentMark, Learner, GradeSymbol } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

interface AssessmentAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  marks: AssessmentMark[];
  learners: Learner[];
}

export const AssessmentAnalyticsDialog = ({ 
  open, 
  onOpenChange, 
  assessment, 
  marks, 
  learners 
}: AssessmentAnalyticsDialogProps) => {
  const { gradingScheme, atRiskThreshold } = useSettings();

  const stats = useMemo(() => {
    if (!assessment) return null;

    // Filter marks for this assessment
    const relevantMarks = marks
      .filter(m => m.assessment_id === assessment.id && m.score !== null)
      .map(m => ({
        learnerId: m.learner_id,
        rawScore: Number(m.score),
        percentage: (Number(m.score) / assessment.max_mark) * 100
      }));

    if (relevantMarks.length === 0) return null;

    const count = relevantMarks.length;
    const sum = relevantMarks.reduce((acc, curr) => acc + curr.percentage, 0);
    const average = sum / count;
    
    const passCount = relevantMarks.filter(m => m.percentage >= 50).length;
    const passRate = (passCount / count) * 100;

    const highest = Math.max(...relevantMarks.map(m => m.percentage));
    const lowest = Math.min(...relevantMarks.map(m => m.percentage));

    // Distribution
    const distribution: { [symbol: string]: number } = {};
    // Initialize with 0
    gradingScheme.forEach(g => distribution[g.symbol] = 0);
    // Add "Ungraded" or "Fail" if not covered? Usually scheme covers 0-100.

    relevantMarks.forEach(m => {
      const sym = getGradeSymbol(m.percentage, gradingScheme);
      if (sym) {
        distribution[sym.symbol] = (distribution[sym.symbol] || 0) + 1;
      }
    });

    const chartData = gradingScheme
      .sort((a, b) => a.min - b.min) // Low to High
      .map(g => ({
        name: g.symbol,
        count: distribution[g.symbol] || 0,
        color: g.color // CSS class string, might need parsing for Recharts fill
      }));

    // Learners needing attention (bottom 5 or below threshold)
    const atRisk = relevantMarks
      .filter(m => m.percentage < atRiskThreshold)
      .map(m => {
        const l = learners.find(l => l.id === m.learnerId);
        return { name: l?.name || 'Unknown', percentage: m.percentage };
      })
      .sort((a, b) => a.percentage - b.percentage);

    return {
      count,
      average: average.toFixed(1),
      passRate: passRate.toFixed(0),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      chartData,
      atRisk
    };
  }, [assessment, marks, learners, gradingScheme, atRiskThreshold]);

  if (!assessment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
             <div>
                <DialogTitle>{assessment.title}</DialogTitle>
                <DialogDescription>{assessment.type} • Max: {assessment.max_mark} • Weight: {assessment.weight}%</DialogDescription>
             </div>
             {stats && (
                 <Badge variant={Number(stats.passRate) >= 80 ? "default" : Number(stats.passRate) >= 50 ? "secondary" : "destructive"}>
                    Pass Rate: {stats.passRate}%
                 </Badge>
             )}
          </div>
        </DialogHeader>

        {stats ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Users className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-2xl font-bold">{stats.count}</span>
                        <span className="text-xs text-muted-foreground">Assessed</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <TrendingUp className="h-5 w-5 text-primary mb-1" />
                        <span className="text-2xl font-bold">{stats.average}%</span>
                        <span className="text-xs text-muted-foreground">Average</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-2xl font-bold">{stats.highest}%</span>
                        <span className="text-xs text-muted-foreground">Highest</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mb-1" />
                        <span className="text-2xl font-bold">{stats.lowest}%</span>
                        <span className="text-xs text-muted-foreground">Lowest</span>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="shadow-none border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Symbol Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.name === 'F' || entry.name === 'FF' ? '#ef4444' : // Red
                                                entry.name === 'A' ? '#16a34a' : // Green
                                                'hsl(var(--primary))'
                                            } />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none border flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Requiring Attention ({stats.atRisk.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto max-h-[220px]">
                        {stats.atRisk.length > 0 ? (
                            <div className="space-y-2">
                                {stats.atRisk.map((l, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-red-50 rounded border border-red-100">
                                        <span className="font-medium text-red-900">{l.name}</span>
                                        <span className="font-bold text-red-700">{l.percentage.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                <CheckCircle2 className="h-8 w-8 text-green-200 mb-2" />
                                <p>No learners below threshold.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
          </ScrollArea>
        ) : (
            <div className="py-12 text-center text-muted-foreground">
                <p>No marks recorded for this assessment yet.</p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};