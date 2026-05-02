import { LearnerAnalyticsTrend } from '@/hooks/useLearnerAnalytics';
import { PASS_THRESHOLD } from '@/constants/diagnostics';

interface WeakAreaLike {
  assessmentTitle?: string | null;
  title?: string | null;
}

interface BuildLearnerCommentParams {
  weightedAverage: number;
  trend: LearnerAnalyticsTrend;
  weakAreas: WeakAreaLike[];
}

const getBaseComment = (score: number): string => {
  if (score >= 70) {
    return 'Strong overall performance with consistent understanding of key concepts.';
  }
  if (score >= PASS_THRESHOLD) {
    return 'Moderate performance. Learner shows understanding but requires reinforcement in some areas.';
  }
  return 'Performance is below expected level. Targeted intervention is required to improve understanding.';
};

export const buildLearnerComment = ({
  weightedAverage,
  trend,
  weakAreas
}: BuildLearnerCommentParams): string => {
  const safeScore = Number.isFinite(weightedAverage) ? weightedAverage : 0;
  const sections: string[] = [getBaseComment(safeScore)];

  if (trend === 'down') {
    sections.push('Recent decline indicates the need for immediate support.');
  } else if (trend === 'up') {
    sections.push('Recent improvement is encouraging.');
  }

  const topWeakArea = (weakAreas || [])
    .map((area) => (area?.assessmentTitle || area?.title || '').trim())
    .find((value) => value.length > 0);

  if (topWeakArea) {
    sections.push(`Focus should be placed on: ${topWeakArea}.`);
  }

  return sections.join(' ');
};
