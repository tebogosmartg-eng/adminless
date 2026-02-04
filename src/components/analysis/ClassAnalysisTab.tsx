"use client";

import { useClassAnalysis } from '@/hooks/useClassAnalysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Loader2, TrendingUp, Users, Target, BookOpen, AlertCircle } from 'lucide-react';
import { Learner } from '@/lib/types';

interface ClassAnalysisTabProps {
  classId: string;
  termId: string | undefined;
  learners: Learner[];
}

export const ClassAnalysisTab = ({ classId, termId, learners }: ClassAnalysisTabProps) => {
  const { analysisData, loading } = useClassAnalysis(classId, termId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Analyzing class performance...</p>
      </div>
    );
  }

  if (!analysisData || analysisData.totalAssessments === 0) {
    return (
      <Card className="mt-6 border-dashed bg-muted/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-semibold">Insufficient Data</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create assessments and record marks to unlock term-scoped class analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { assessmentPerformance, learnerPerformance, classAverage } = analysisData;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" /> Term Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{classAverage}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Weighted class average for this term</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" /> Assessment Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{Math.max(...assessmentPerformance.map(a => a.avg))}%</span>
                <span className="text-muted-foreground text-xs">highest average task</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Across {assessmentPerformance.length} assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {Math.round((learnerPerformance.filter(l => l.average >= 50).length / learnerPerformance.length) * 100)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Percentage of learners currently passing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Performance Timeline
            </CardTitle>
            <CardDescription>Average achievement across chronological assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assessmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="title" 
                    tick={{ fontSize: 10 }} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Avg']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rank Performance</CardTitle>
            <CardDescription>Individual learner averages sorted descending.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={learnerPerformance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="learnerId" 
                    tickFormatter={(id) => learners.find(l => l.id === id)?.name.split(' ')[0] || ''}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(id) => learners.find(l => l.id === id)?.name || ''}
                    formatter={(val) => [`${val}%`, 'Term Avg']}
                  />
                  <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                    {learnerPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.average >= 50 ? 'hsl(var(--primary))' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Attendance vs. Achievement Correlation</CardTitle>
          <CardDescription>Analyzes the impact of presence on academic results for this class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    type="number" 
                    dataKey="attendanceRate" 
                    name="Attendance" 
                    unit="%" 
                    domain={[0, 100]}
                    label={{ value: 'Attendance %', position: 'bottom', fontSize: 10 }}
                />
                <YAxis 
                    type="number" 
                    dataKey="average" 
                    name="Mark" 
                    unit="%" 
                    domain={[0, 100]}
                    label={{ value: 'Average %', angle: -90, position: 'left', fontSize: 10 }}
                />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={({ payload }) => {
                        if (payload && payload.length) {
                            const data = payload[0].payload;
                            const learner = learners.find(l => l.id === data.learnerId);
                            return (
                                <div className="bg-popover border p-3 rounded-lg shadow-lg text-xs">
                                    <p className="font-bold mb-1">{learner?.name}</p>
                                    <p>Mark: <span className="font-semibold">{data.average}%</span></p>
                                    <p>Attendance: <span className="font-semibold">{data.attendanceRate}%</span></p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Scatter data={learnerPerformance.filter(l => l.attendanceRate !== null)} fill="hsl(var(--primary))" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};