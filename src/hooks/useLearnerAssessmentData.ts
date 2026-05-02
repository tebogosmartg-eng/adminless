import { useQuery } from '@tanstack/react-query';
import { queryRetry } from '@/utils/queryDefaults';
import { logAdminLessError } from '@/utils/logAdminLessError';
import { supabase } from '@/lib/supabaseClient';
import { AssessmentResult } from '@/lib/types';
import { applySupabaseAssessmentOrder, sortAssessmentsDeterministically } from '@/utils/assessmentOrdering';
import { withTimeout } from '@/utils/withTimeout';

export { type AssessmentResult };

const LEARNER_ASSESSMENT_FETCH_MS = 45_000;

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
};

const fetchLearnerAssessmentData = async (
  learnerId: string,
  signal?: AbortSignal
): Promise<AssessmentResult[]> => {
  throwIfAborted(signal);

  const { data: marks, error: marksError } = await withTimeout(
    supabase.from('assessment_marks').select('*').eq('learner_id', learnerId),
    LEARNER_ASSESSMENT_FETCH_MS,
    'learner.assessment_marks.by_learner'
  );

  if (marksError) throw marksError;

  if (!marks || marks.length === 0) {
    return [];
  }

  throwIfAborted(signal);

  const assessmentIds = marks.map((m) => m.assessment_id);

  const { data: assessments, error: assError } = await withTimeout(
    applySupabaseAssessmentOrder(
      supabase.from('assessments').select('*').in('id', assessmentIds)
    ),
    LEARNER_ASSESSMENT_FETCH_MS,
    'learner.assessments.by_ids'
  );

  if (assError) throw assError;

  if (!assessments || assessments.length === 0) {
    return [];
  }

  const termIds = [...new Set(assessments.map((a) => a.term_id))];
  if (termIds.length === 0) {
    return [];
  }

  throwIfAborted(signal);

  const [termsRes, allMarksRes] = await Promise.all([
    withTimeout(
      supabase.from('terms').select('*').in('id', termIds),
      LEARNER_ASSESSMENT_FETCH_MS,
      'learner.terms'
    ),
    withTimeout(
      supabase.from('assessment_marks').select('*').in('assessment_id', assessmentIds),
      LEARNER_ASSESSMENT_FETCH_MS,
      'learner.assessment_marks.for_averages'
    ),
  ]);

  if (termsRes.error) throw termsRes.error;
  if (allMarksRes.error) throw allMarksRes.error;

  const terms = termsRes.data;
  const allMarksForAssessments = allMarksRes.data;

  const termMap = new Map(terms?.map((t) => [t.id, t.name]) || []);

  const assessmentAverages = new Map<string, number>();
  const orderedAssessments = sortAssessmentsDeterministically(assessments || []);

  orderedAssessments.forEach((ass) => {
    const marksForAss =
      allMarksForAssessments?.filter((m) => m.assessment_id === ass.id && m.score !== null) || [];
    if (marksForAss.length > 0) {
      const totalScore = marksForAss.reduce((sum, m) => sum + Number(m.score), 0);
      const avgScore = totalScore / marksForAss.length;
      const avgPercent = (avgScore / ass.max_mark) * 100;
      assessmentAverages.set(ass.id, avgPercent);
    }
  });

  const assessmentOrder = new Map(orderedAssessments.map((assessment, index) => [assessment.id, index]));

  const formatted = marks
    .map((m) => {
      const ass = orderedAssessments.find((a) => a.id === m.assessment_id);

      if (!ass) return null;

      const score = m.score ? Number(m.score) : null;
      const percentage = score !== null ? (score / ass.max_mark) * 100 : null;

      return {
        orderIndex: assessmentOrder.get(ass.id) ?? Number.POSITIVE_INFINITY,
        result: {
          id: ass.id,
          termName: termMap.get(ass.term_id) || 'Unknown Term',
          termId: ass.term_id,
          classId: ass.class_id ?? null,
          academicYearId: ass.academic_year_id ?? null,
          assessmentTitle: ass.title,
          assessmentType: ass.type,
          date: ass.date || new Date().toISOString(),
          score,
          max: ass.max_mark,
          weight: ass.weight,
          percentage: percentage ? parseFloat(percentage.toFixed(1)) : null,
          classAverage:
            assessmentAverages.get(ass.id) !== undefined
              ? parseFloat(assessmentAverages.get(ass.id)!.toFixed(1))
              : null,
        },
      };
    })
    .filter((item) => item !== null) as Array<{ orderIndex: number; result: AssessmentResult }>;

  formatted.sort((a, b) => {
    const orderDiff = a.orderIndex - b.orderIndex;
    if (orderDiff !== 0) return orderDiff;
    return (a.result.termId || '').localeCompare(b.result.termId || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  const sortedResults: AssessmentResult[] = formatted.map((item) => item.result);

  let runningSum = 0;
  let runningCount = 0;

  return sortedResults.map((item) => {
    let previousAverage: number | null = null;
    let trend: 'Improving' | 'Declining' | 'Stable' | null = null;

    if (runningCount > 0) {
      previousAverage = runningSum / runningCount;

      if (item.percentage !== null) {
        if (item.percentage >= previousAverage + 5) {
          trend = 'Improving';
        } else if (item.percentage <= previousAverage - 5) {
          trend = 'Declining';
        } else {
          trend = 'Stable';
        }
      }
    }

    if (item.percentage !== null) {
      runningSum += item.percentage;
      runningCount++;
    }

    return {
      ...item,
      previousAverage: previousAverage !== null ? parseFloat(previousAverage.toFixed(1)) : null,
      trend,
    };
  });
};

export const useLearnerAssessmentData = (learnerId: string | undefined) => {
  const query = useQuery({
    queryKey: ['learner-assessment-data', learnerId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchLearnerAssessmentData(learnerId as string, signal);
      } catch (e) {
        logAdminLessError('learner_assessment_data_fetch', e);
        throw e;
      }
    },
    enabled: !!learnerId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: queryRetry,
  });

  const error: Error | null =
    query.error == null
      ? null
      : query.error instanceof Error
        ? query.error
        : new Error(String(query.error));

  const data = query.data ?? [];
  const hasKey = !!learnerId;

  return {
    data,
    loading: hasKey ? query.isLoading : false,
    isLoading: hasKey ? query.isLoading : false,
    isFetching: hasKey ? query.isFetching : false,
    results: data,
    error,
    refetch: query.refetch,
  };
};
