"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Assessment, AssessmentMark, Learner, GradeSymbol } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, CheckCircle2, AlertTriangle, AlertCircle, Scale, Target, XCircle } from 'lucide-react';
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

    // Filter marks for this assessment and map to percentages
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
    
    // Median Calculation
    const sortedByMark = [...relevantMarks].sort((a, b) => a.percentage - b.percentage);
    const mid = Math.floor(sortedByMark.length / 2);
    const median = sortedByMark.length % 2 !== 0 
        ? sortedByMark[mid].percentage 
        : (sortedByMark[mid - 1].percentage + sortedByMark[mid].percentage) / 2;

    const highest = Math.max(...relevantMarks.map(m => m.percentage));
    const lowest = Math.min(...relevantMarks.map(m => m.percentage));

    const passCount = relevantMarks.filter(m => m.percentage >= 50).length;
    const failCount = count - passCount;
    const passRate = (passCount / count) * 100;

    // Distribution
    const distribution: { [symbol: string]: number } = {};
    gradingScheme.forEach(g => distribution[g.symbol] = 0);

    relevantMarks.forEach(m => {
      const sym = getGradeSymbol(m.percentage, gradingScheme);
      if (sym) {
        distribution[sym.symbol] = (distribution[sym.symbol] || 0) + 1;
      }
    });

    const chartData = gradingScheme
      .sort((a, b) => a.min - b.min)
      .map(g => ({
        name: g.symbol,
        count: distribution[g.symbol] || 0
      }));

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
      median: median.toFixed(1),
      passCount,
      failCount,
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
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0 mb-4 border-b pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="space-y-1">
                <DialogTitle className="text-xl sm:text-2xl font-bold truncate pr-2">{assessment.title} Analytics</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">{assessment.type} • Max: {assessment.max_mark} • Weight: {assessment.weight}%</DialogDescription>
             </div>
             {stats && (
                 <Badge variant={Number(stats.passRate) >= 80 ? "default" : Number(stats.passRate) >= 50 ? "secondary" : "destructive"} className="px-3 py-1 text-xs h-7">
                    Pass Rate: {stats.passRate}%
                 </Badge>
             )}
          </div>
        </DialogHeader>

        {stats ? (
          <ScrollArea className="flex-1 pr-2 sm:pr-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-6">
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <Users className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-lg sm:text-xl font-bold">{stats.count}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Learners</span>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <Target className="h-4 w-4 text-primary mb-1" />
                        <span className="text-lg sm:text-xl font-bold text-primary">{stats.average}%</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-primary/60">Average</span>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <Scale className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-lg sm:text-xl font-bold">{stats.median}%</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Median</span>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/20 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                        <span className="text-lg sm:text-xl font-bold text-green-600">{stats.passCount}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-green-600/60">Passes</span>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/20 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <XCircle className="h-4 w-4 text-red-600 mb-1" />
                        <span className="text-lg sm:text-xl font-bold text-red-600">{stats.failCount}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-red-600/60">Fails</span>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-lg sm:text-xl font-bold">{stats.highest}%</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Highest</span>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <TrendingDown className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-lg sm:text-xl font-bold">{stats.lowest}%</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Lowest</span>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 pb-6">
                <Card className="shadow-none border bg-muted/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Symbol Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] sm:h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis allowDecimals={false} hide />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {stats.chartData.map((entry, index) => {
                                            const grade = gradingScheme.find(g => g.symbol === entry.name);
                                            return <Cell key={`cell-${index}`} fill={grade ? grade.color.replace('text-', 'var(--') : 'hsl(var(--primary))'} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none border flex flex-col bg-muted/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                            Requiring Intervention ({stats.atRisk.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto max-h-[250px] pr-2">
                        {stats.atRisk.length > 0 ? (
                            <div className="space-y-2">
                                {stats.atRisk.map((l, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs sm:text-sm p-2 bg-background rounded border border-border shadow-sm group">
                                        <span className="font-medium truncate pr-2">{l.name}</span>
                                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 shrink-0">
                                            {l.percentage.toFixed(0)}%
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs sm:text-sm py-8 sm:py-12">
                                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-200 mb-2 sm:mb-3" />
                                <p className="font-medium text-foreground">Perfect Pass Rate</p>
                                <p className="text-[10px] sm:text-xs mt-1 px-4 text-center">No learners scoring below {atRiskThreshold}%</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
          </ScrollArea>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 min-h-[300px] text-center px-4">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 opacity-20" />
                <p className="text-sm">No marks have been recorded for this assessment yet.</p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};