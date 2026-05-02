import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, Calendar, FileText, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { format } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { useLearnerAnalytics } from '@/hooks/useLearnerAnalytics';
import { AssessmentResult } from '@/hooks/useLearnerAssessmentData';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileAcademicTabProps {
  learnerId?: string;
  academicYearId?: string;
  termId?: string;
  classId?: string;
  /** Lifted from parent to avoid duplicate learner assessment queries. */
  prefetchedResults?: AssessmentResult[];
  prefetchedLoading?: boolean;
  prefetchedError?: Error | null;
  prefetchedIsFetching?: boolean;
}

export const ProfileAcademicTab = ({
  learnerId,
  academicYearId,
  termId,
  classId,
  prefetchedResults,
  prefetchedLoading,
  prefetchedError,
  prefetchedIsFetching
}: ProfileAcademicTabProps) => {
  const { atRiskThreshold } = useSettings();
  const analytics = useLearnerAnalytics({
    learnerId,
    academicYearId,
    termId,
    classId,
    ...(prefetchedResults !== undefined && prefetchedLoading !== undefined
      ? { prefetchedResults, prefetchedLoading, prefetchedError, prefetchedIsFetching }
      : {})
  });
  const safeAssessments = analytics.assessments ?? [];
  const safeChartData = analytics.chartData ?? [];
  const safeAssessmentsByTerm = analytics.assessmentsByTerm ?? [];
  const hasData = safeAssessments.length > 0;
  const err = analytics.error;

  if (analytics.isLoading && !hasData && !err) {
    return (
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analytics.isLoading && !err && !hasData) {
    return (
      <EmptyState
        title="No assessments yet"
        description='Use the "Assessments" tab in Class Details to capture marks.'
        icon={<FileText className="h-12 w-12 opacity-20" />}
      />
    );
  }

  return (
    <div className="space-y-6 pt-4 h-full overflow-y-auto pr-2">
      {analytics.isFetching && hasData && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
          Updating…
        </p>
      )}
      {err && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load data</AlertTitle>
          <AlertDescription>Connection issue, please retry.</AlertDescription>
        </Alert>
      )}
      {!hasData ? null : (
        <>
      {/* Trend Chart */}
      <Card className="p-4 border shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Performance Trend</h4>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                hide 
              />
              <YAxis domain={[0, 100]} width={30} tick={{fontSize: 10}} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as { id: string; date: string; score: number };
                    const detail = safeAssessments.find((assessment) => assessment.id === data.id);
                    return (
                      <div className="bg-popover border rounded-md p-2 shadow-md text-xs">
                        <p className="font-bold mb-1">{detail?.assessmentTitle ?? 'Assessment'}</p>
                        <div className="space-y-1">
                            <p className="text-primary font-bold">Learner: {data.score}%</p>
                            {detail?.classAverage && <p className="text-muted-foreground">Class Avg: {detail.classAverage}%</p>}
                        </div>
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {data.date ? format(new Date(data.date), 'MMM d') : 'Unknown date'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="plainline"/>
              <ReferenceLine y={atRiskThreshold} stroke="red" strokeDasharray="3 3" opacity={0.3} />
              
              <Line 
                type="monotone" 
                dataKey="score" 
                name="Learner"
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                activeDot={{ r: 6 }} 
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
              
              <Line 
                type="monotone" 
                dataKey="classAverage" 
                name="Class Avg"
                stroke="#94a3b8" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Term Breakdowns */}
      <div className="space-y-6">
        {safeAssessmentsByTerm.map(({ termName, items }) => (
          <div key={termName} className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
               <h4 className="font-semibold text-sm">{termName}</h4>
               <Badge variant="outline" className="text-[10px]">{items.length} assessments</Badge>
            </div>
            <div className="grid gap-2">
              {(items ?? []).map((item, idx) => {
                const isHighRisk = item.trend === 'Declining' && item.percentage !== null && item.percentage < atRiskThreshold;

                return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isHighRisk ? 'bg-red-50/50 border-red-200 hover:bg-red-50' : 'bg-muted/30 hover:bg-muted/50'}`}>
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate" title={item.assessmentTitle}>{item.assessmentTitle}</span>
                          {isHighRisk && (
                            <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-widest gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {item.date ? format(new Date(item.date), 'dd MMM') : 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>{item.assessmentType}</span>
                          <span>•</span>
                          <span>W: {item.weight}%</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {item.percentage !== null ? (
                          <>
                            <div className={`text-lg font-bold ${item.percentage >= atRiskThreshold ? 'text-green-600' : 'text-red-600'}`}>
                              {item.percentage}%
                            </div>
                            {item.classAverage && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Class Avg: {item.classAverage}%
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {item.previousAverage !== null ? (
                                  <>
                                      Prev: {item.previousAverage}%
                                      <span className={`ml-1 ${item.trend === 'Improving' ? 'text-green-600' : item.trend === 'Declining' ? 'text-red-600' : 'text-blue-600'}`}>
                                          ({item.trend})
                                      </span>
                                  </>
                              ) : (
                                  <span className="italic opacity-60">No prior data</span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Pending</span>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  );
};