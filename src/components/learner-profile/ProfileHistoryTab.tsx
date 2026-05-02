import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, History, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useLearnerAnalytics } from '@/hooks/useLearnerAnalytics';
import { AssessmentResult } from '@/hooks/useLearnerAssessmentData';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { PASS_THRESHOLD } from '@/constants/diagnostics';

interface ProfileHistoryTabProps {
  learnerId?: string;
  academicYearId?: string;
  termId?: string;
  classId?: string;
  prefetchedResults?: AssessmentResult[];
  prefetchedLoading?: boolean;
  prefetchedError?: Error | null;
  prefetchedIsFetching?: boolean;
}

export const ProfileHistoryTab = ({
  learnerId,
  academicYearId,
  termId,
  classId,
  prefetchedResults,
  prefetchedLoading,
  prefetchedError,
  prefetchedIsFetching
}: ProfileHistoryTabProps) => {
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
  const safeLearnerGroups = analytics.learnerGroups ?? [];
  const safeWeakAreas = analytics.weakAreas ?? [];
  const hasData = safeAssessments.length > 0;
  const err = analytics.error;

  if (analytics.isLoading && !hasData && !err) {
    return (
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[250px] w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (!analytics.isLoading && !err && !hasData) {
    return (
      <EmptyState
        title="No assessment history"
        description="History appears as soon as assessments are captured for this learner."
        icon={<TrendingUp className="h-12 w-12 opacity-20" />}
      />
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 pt-4">
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
      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 p-3 rounded-lg text-center border">
          <span className="text-xs text-muted-foreground">Average</span>
          <p className="text-xl font-bold">{analytics.weightedAverage}%</p>
        </div>
        <div className="bg-muted/30 p-3 rounded-lg text-center border">
          <span className="text-xs text-muted-foreground">Assessments</span>
          <p className="text-xl font-bold">{analytics.totalAssessments}</p>
        </div>
        <div className="bg-muted/30 p-3 rounded-lg text-center border">
          <span className="text-xs text-muted-foreground">Highest</span>
          <p className="text-xl font-bold text-green-600">{analytics.highestScore}%</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="h-[250px] w-full border rounded-lg p-2 bg-card animate-in fade-in duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safeChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as { id: string; score: number };
                  const detail = safeAssessments.find((assessment) => assessment.id === d.id);
                  return (
                    <div className="bg-popover border text-popover-foreground text-xs p-2 rounded shadow-md">
                      <p className="font-bold">{detail?.assessmentTitle ?? 'Assessment'}</p>
                      <p className="text-muted-foreground">{detail?.assessmentType ?? '-'} ({detail?.weight ?? 0}%)</p>
                      <p className="text-primary font-bold">{d.score}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={PASS_THRESHOLD} stroke="red" strokeDasharray="3 3" opacity={0.3} />
            <Line 
              type="monotone" 
              dataKey="score"
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/20 rounded-md border p-2">
          <span className="text-muted-foreground">Lowest</span>
          <p className="font-semibold">{analytics.lowestScore}%</p>
        </div>
        <div className="bg-muted/20 rounded-md border p-2">
          <span className="text-muted-foreground">Trend</span>
          <p className="font-semibold capitalize">{analytics.trend}</p>
        </div>
        <div className="bg-muted/20 rounded-md border p-2">
          <span className="text-muted-foreground">Weak Areas</span>
          <p className="font-semibold">{safeWeakAreas.length}</p>
        </div>
        <div className="bg-muted/20 rounded-md border p-2">
          <span className="text-muted-foreground">Groups</span>
          <p className="font-semibold">
            {safeLearnerGroups.map((group) => `${group.label}:${group.count}`).join(' | ') || 'No grouping data'}
          </p>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
        <div className="bg-muted/50 p-2 border-b">
          <h4 className="text-xs font-semibold flex items-center gap-2">
            <History className="h-3 w-3" /> Assessment History
          </h4>
        </div>
        <ScrollArea className="flex-1 h-[200px]">
          <div className="divide-y">
            {safeAssessments.map((item, index) => (
              <div key={`${item.termId}-${item.assessmentTitle}-${item.date}-${index}`} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-primary" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium truncate max-w-[200px]">{item.assessmentTitle}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {item.assessmentType ?? 'Assessment'} ({item.weight ?? 0}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${(item.percentage ?? 0) >= PASS_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                    {item.percentage ?? '-'}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
        </>
      )}
    </div>
  );
};