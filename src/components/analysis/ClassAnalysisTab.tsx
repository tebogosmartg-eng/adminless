"use client";

import { useClassAnalysis } from '@/hooks/useClassAnalysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Loader2, TrendingUp, Target, BookOpen, AlertCircle, UserCheck, ShieldAlert } from 'lucide-react';
import { Learner } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClassAnalysisTabProps {
  classId: string;
  termId: string | undefined;
  learners: Learner[];
}

export const ClassAnalysisTab = ({ classId, termId, learners }: ClassAnalysisTabProps) => {
  const { analysisData, loading } = useClassAnalysis(classId, termId);
  const { atRiskThreshold } = useSettings();

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

  const { assessmentPerformance, learnerPerformance, classAverage, passRate } = analysisData;

  const topPerformers = learnerPerformance.slice(0, 3);
  const atRiskLearners = learnerPerformance.filter(l => l.average < atRiskThreshold);

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top Pulse Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" /> Term Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{classAverage}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Weighted achievement</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Stability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{Math.max(...assessmentPerformance.map(a => a.avg))}%</span>
                <span className="text-muted-foreground text-xs">peak avg</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Across {assessmentPerformance.length} tasks</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">
                {passRate}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Learners meeting 50% target</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Performance Timeline */}
        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 font-bold">
                <TrendingUp className="h-4 w-4 text-primary" /> Performance Timeline
            </CardTitle>
            <CardDescription>Average achievement across chronological assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
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
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`${val}%`, 'Avg']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* Excellence Spotlight */}
          <Card className="shadow-none">
              <CardHeader className="pb-3 border-b bg-muted/5">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" /> Excellence Spotlight
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                  {topPerformers.map((l, i) => {
                      const details = learners.find(st => st.id === l.learnerId);
                      return (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                                      #{i+1}
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-sm font-bold">{details?.name}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase font-black">Top Tier Performer</span>
                                  </div>
                              </div>
                              <Badge className="bg-green-600 text-white border-none">{l.average}%</Badge>
                          </div>
                      );
                  })}
              </CardContent>
          </Card>

          {/* Intervention Focus */}
          <Card className="shadow-none">
              <CardHeader className="pb-3 border-b bg-muted/5">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-600" /> Academic Intervention
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                  {atRiskLearners.slice(0, 4).map((l, i) => {
                      const details = learners.find(st => st.id === l.learnerId);
                      return (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                                      <AlertCircle className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-sm font-bold">{details?.name}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase font-black">Below {atRiskThreshold}% Threshold</span>
                                  </div>
                              </div>
                              <Badge variant="destructive">{l.average}%</Badge>
                          </div>
                      );
                  })}
                  {atRiskLearners.length === 0 && (
                      <div className="py-10 text-center text-muted-foreground italic text-xs">
                          All learners are currently performing above the risk threshold.
                      </div>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
};