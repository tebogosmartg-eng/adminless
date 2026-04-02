"use client";

import { useClassAnalysis } from '@/hooks/useClassAnalysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Loader2, TrendingUp, Target, BookOpen, AlertCircle, UserCheck, ShieldAlert, Users, User, FileText, CalendarCheck, FileWarning } from 'lucide-react';
import { Learner } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";

interface ClassAnalysisTabProps {
  classId: string;
  termId: string | undefined;
  learners: Learner[];
}

export const ClassAnalysisTab = ({ classId, termId, learners }: ClassAnalysisTabProps) => {
  const { analysisData, loading } = useClassAnalysis(classId, termId, learners.length);
  const { atRiskThreshold } = useSettings();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Analyzing class performance...</p>
      </div>
    );
  }

  // Calculate Class Overview Stats
  const totalLearners = learners.length;
  const maleCount = learners.filter(l => l.gender === 'Male').length;
  const femaleCount = learners.filter(l => l.gender === 'Female').length;
  const unassignedCount = totalLearners - maleCount - femaleCount;
  const assessmentsCount = analysisData?.totalAssessments || 0;
  const attendanceRate = analysisData?.attendanceRate || 0;
  const missingMarksCount = analysisData?.missingMarksCount || 0;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Class Overview Grid - Interactive */}
      <TooltipProvider delayDuration={100}>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-none border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/30 group cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary transition-transform duration-300 group-hover:scale-125" /> Total Learners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-black text-foreground">{totalLearners}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Total learners currently enrolled in this class roster.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-none border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-blue-300 group cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-500 transition-transform duration-300 group-hover:scale-125" /> Boys
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-black text-foreground">{maleCount}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Number of male learners recorded.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-none border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-pink-300 group cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-pink-500 transition-transform duration-300 group-hover:scale-125" /> Girls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                      <div className="text-2xl lg:text-3xl font-black text-foreground">{femaleCount}</div>
                  </div>
                  {unassignedCount > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">+{unassignedCount} unassigned</p>
                  )}
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Number of female learners recorded.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-none border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-purple-300 group cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-purple-500 transition-transform duration-300 group-hover:scale-125" /> Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-black text-foreground">{assessmentsCount}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Total formal assessment tasks created for this term.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-none border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-green-300 group cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <CalendarCheck className="h-3.5 w-3.5 text-green-500 transition-transform duration-300 group-hover:scale-125" /> Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-black text-foreground">{attendanceRate}%</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Average attendance rate for this class over the current term.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className={cn(
                  "shadow-none border bg-card transition-all duration-300 group cursor-default",
                  missingMarksCount > 0 
                    ? "hover:shadow-md hover:-translate-y-1 hover:shadow-amber-500/10 hover:border-amber-300" 
                    : "hover:shadow-md hover:-translate-y-1 hover:border-primary/20"
                )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FileWarning className={cn(
                      "h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-125",
                      missingMarksCount > 0 ? "text-amber-500" : "text-muted-foreground"
                    )} /> Missing Marks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl lg:text-3xl font-black transition-colors duration-300", 
                    missingMarksCount > 0 ? "text-amber-600 group-hover:text-amber-500" : "text-foreground"
                  )}>
                      {missingMarksCount}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {missingMarksCount > 0 
                  ? `${missingMarksCount} expected marks have not been recorded yet.` 
                  : "All marks for created assessments are fully captured."}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Performance Section - Requires Marks */}
      {!analysisData || analysisData.totalAssessments === 0 ? (
        <Card className="border-dashed bg-muted/5 mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">Insufficient Performance Data</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Create assessments and record marks to unlock term-scoped class analysis and performance trends.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Pulse Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20 shadow-none hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-primary" /> Term Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">{analysisData.classAverage}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Weighted achievement</p>
              </CardContent>
            </Card>

            <Card className="shadow-none border hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Stability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{Math.max(...analysisData.assessmentPerformance.map(a => a.avg))}%</span>
                    <span className="text-muted-foreground text-xs">peak avg</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Across {analysisData.assessmentPerformance.length} tasks</p>
              </CardContent>
            </Card>

            <Card className="shadow-none border hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Pass Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">
                    {analysisData.passRate}%
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
                    <LineChart data={analysisData.assessmentPerformance}>
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
                      <RechartsTooltip 
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
              <Card className="shadow-none border">
                  <CardHeader className="pb-3 border-b bg-muted/5">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" /> Excellence Spotlight
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                      {analysisData.learnerPerformance.slice(0, 3).map((l, i) => {
                          const details = learners.find(st => st.id === l.learnerId);
                          return (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
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
              <Card className="shadow-none border">
                  <CardHeader className="pb-3 border-b bg-muted/5">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-red-600" /> Academic Intervention
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                      {analysisData.learnerPerformance.filter(l => l.average < atRiskThreshold).slice(0, 4).map((l, i) => {
                          const details = learners.find(st => st.id === l.learnerId);
                          return (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
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
                      {analysisData.learnerPerformance.filter(l => l.average < atRiskThreshold).length === 0 && (
                          <div className="py-10 text-center text-muted-foreground italic text-xs">
                              All learners are currently performing above the risk threshold.
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
        </>
      )}
    </div>
  );
};