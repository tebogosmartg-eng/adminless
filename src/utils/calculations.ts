import { Assessment, AssessmentMark } from "@/lib/types";

/**
 * Shared logic for rounding marks consistently across the application.
 * Rounds to 1 decimal place and removes trailing .0 for cleaner UI.
 */
export const formatDisplayMark = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  
  return num.toFixed(1).replace(/\.0$/, '');
};

/**
 * Calculates a weighted average for a set of assessments.
 * Handles normalization: if weights don't sum to 100, it calculates the 
 * relative performance based on the active/available weights.
 */
export const calculateWeightedAverage = (
  assessments: Assessment[],
  marks: AssessmentMark[],
  learnerId: string
): number => {
  let weightedScoreSum = 0;
  let totalWeightAccountedFor = 0;

  assessments.forEach(ass => {
    const markRecord = marks.find(m => m.assessment_id === ass.id && m.learner_id === learnerId);
    
    // Safety check: skip if max_mark is 0 to avoid Infinity
    if (ass.max_mark <= 0) return;

    // We only count assessments that HAVE a mark recorded
    if (markRecord && markRecord.score !== null && markRecord.score !== undefined) {
      const score = Number(markRecord.score);
      const percentage = (score / ass.max_mark);
      
      weightedScoreSum += (percentage * ass.weight);
      totalWeightAccountedFor += ass.weight;
    }
  });

  // If no weights were found or used (e.g. no marks recorded yet)
  if (totalWeightAccountedFor <= 0) return 0;

  // Normalize to 100%
  // Formula: (Sum of (Mark/Max * Weight) / Sum of Weights used) * 100
  const finalPercentage = (weightedScoreSum / totalWeightAccountedFor) * 100;
  
  return parseFloat(finalPercentage.toFixed(2));
};