import { useMemo } from 'react';
import { AssessmentResult } from '@/hooks/useLearnerAssessmentData';
import { useLearnerAssessmentData } from '@/hooks/useLearnerAssessmentData';
import { PASS_THRESHOLD } from '@/constants/diagnostics';

export type LearnerAnalyticsTrend = 'up' | 'down' | 'stable';

export interface LearnerGroupSummary {
  label: 'strong' | 'average' | 'weak';
  count: number;
}

export interface LearnerAnalyticsResult {
  assessments: AssessmentResult[];
  assessmentsByTerm: Array<{ termName: string; items: AssessmentResult[] }>;
  chartData: Array<{ id: string; date: string; score: number }>;
  weightedAverage: number;
  highestScore: number;
  lowestScore: number;
  trend: LearnerAnalyticsTrend;
  totalAssessments: number;
  weakAreas: AssessmentResult[];
  learnerGroups: LearnerGroupSummary[];
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isFetching: boolean;
}

interface UseLearnerAnalyticsParams {
  learnerId?: string;
  academicYearId?: string;
  termId?: string;
  classId?: string;
  weakThreshold?: number;
  /** When both are set, skips internal `useLearnerAssessmentData` (e.g. dialog lifts a single query). */
  prefetchedResults?: AssessmentResult[];
  prefetchedLoading?: boolean;
  prefetchedError?: Error | null;
  prefetchedIsFetching?: boolean;
}

const DEFAULT_ANALYTICS_RESULT: Omit<LearnerAnalyticsResult, 'isLoading' | 'loading' | 'error' | 'isFetching'> = {
  assessments: [],
  assessmentsByTerm: [],
  chartData: [],
  weightedAverage: 0,
  highestScore: 0,
  lowestScore: 0,
  trend: 'stable',
  totalAssessments: 0,
  weakAreas: [],
  learnerGroups: []
};

const toNumericScore = (assessment: AssessmentResult): number | null => {
  if (assessment.percentage !== null && Number.isFinite(assessment.percentage)) {
    return assessment.percentage;
  }

  if (assessment.score !== null && Number.isFinite(assessment.score)) {
    return assessment.score;
  }

  return null;
};

const compareByDate = (a: AssessmentResult, b: AssessmentResult): number => {
  const aTime = a.date ? new Date(a.date).getTime() : 0;
  const bTime = b.date ? new Date(b.date).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return a.assessmentTitle.localeCompare(b.assessmentTitle, undefined, { numeric: true, sensitivity: 'base' });
};

export const useLearnerAnalytics = ({
  learnerId,
  academicYearId,
  termId,
  classId,
  weakThreshold = PASS_THRESHOLD,
  prefetchedResults,
  prefetchedLoading,
  prefetchedError,
  prefetchedIsFetching
}: UseLearnerAnalyticsParams): LearnerAnalyticsResult => {
  const useLifted = prefetchedResults !== undefined && prefetchedLoading !== undefined;
  const assessmentData = useLearnerAssessmentData(useLifted ? undefined : learnerId);
  const isLoading = Boolean(useLifted ? prefetchedLoading : assessmentData?.loading);
  const loading = isLoading;
  const assessmentError: Error | null = useLifted
    ? (prefetchedError ?? null)
    : (assessmentData?.error ?? null);
  const isFetching = useLifted ? Boolean(prefetchedIsFetching) : Boolean(assessmentData?.isFetching);
  const safeResults = Array.isArray(useLifted ? prefetchedResults : assessmentData?.results)
    ? (useLifted ? prefetchedResults! : assessmentData!.results)
    : [];
  const safeWeakThreshold = Number.isFinite(weakThreshold) ? weakThreshold : PASS_THRESHOLD;

  return useMemo(() => {
    if (isLoading) {
      return {
        ...DEFAULT_ANALYTICS_RESULT,
        isLoading,
        loading,
        error: null,
        isFetching
      };
    }

    if (safeResults.length === 0) {
      return {
        ...DEFAULT_ANALYTICS_RESULT,
        isLoading: false,
        loading: false,
        error: assessmentError,
        isFetching
      };
    }

    const scopedAssessments = safeResults.filter((assessment) => {
      const matchesYear = !academicYearId || assessment.academicYearId === academicYearId;
      const matchesTerm = !termId || assessment.termId === termId;
      const matchesClass = !classId || assessment.classId === classId;
      return matchesYear && matchesTerm && matchesClass;
    });
    if (scopedAssessments.length === 0) {
      return {
        ...DEFAULT_ANALYTICS_RESULT,
        isLoading: false,
        loading: false,
        error: assessmentError,
        isFetching
      };
    }

    const assessments = [...scopedAssessments].sort(compareByDate);
    const scoredAssessments = assessments
      .map((assessment) => ({ assessment, score: toNumericScore(assessment) }))
      .filter((item): item is { assessment: AssessmentResult; score: number } => item.score !== null);

    const scores = scoredAssessments.map((item) => item.score);
    const totalAssessments = assessments.length;
    const weightedAverage = scores.length > 0
      ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
      : 0;

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const lastTwo = scores.slice(-2);
    let trend: LearnerAnalyticsTrend = 'stable';
    if (lastTwo.length === 2) {
      if (lastTwo[1] > lastTwo[0]) trend = 'up';
      else if (lastTwo[1] < lastTwo[0]) trend = 'down';
    }

    const weakAreas = scoredAssessments
      .filter((item) => item.score < safeWeakThreshold)
      .map((item) => item.assessment);

    const learnerGroups: LearnerGroupSummary[] = [
      { label: 'strong', count: scoredAssessments.filter((item) => item.score >= 75).length },
      { label: 'average', count: scoredAssessments.filter((item) => item.score >= safeWeakThreshold && item.score < 75).length },
      { label: 'weak', count: scoredAssessments.filter((item) => item.score < safeWeakThreshold).length }
    ];

    const chartData = scoredAssessments.map((item) => ({
      id: item.assessment.id,
      date: item.assessment.date,
      score: item.score
    }));

    const assessmentsByTerm = Object.entries(
      assessments.reduce<Record<string, AssessmentResult[]>>((acc, assessment) => {
        if (!acc[assessment.termName]) {
          acc[assessment.termName] = [];
        }
        acc[assessment.termName].push(assessment);
        return acc;
      }, {})
    ).map(([termName, items]) => ({ termName, items }));

    return {
      assessments,
      assessmentsByTerm,
      chartData,
      weightedAverage,
      highestScore,
      lowestScore,
      trend,
      totalAssessments,
      weakAreas,
      learnerGroups,
      isLoading,
      loading,
      error: assessmentError,
      isFetching
    };
  }, [academicYearId, assessmentError, classId, isFetching, isLoading, loading, safeResults, safeWeakThreshold, termId]);
};
