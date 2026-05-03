import { Assessment, AssessmentMark, Learner } from "@/lib/types";
import { parseMarkInput } from "./marks";
import { validateClassTermForFinalization, readinessToDisplayLists } from "@/utils/termFinalizationValidation";

export interface IntegrityReport {
  isValid: boolean;
  score: number; // 0-100 health score
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single mark entry against assessment bounds.
 */
export const validateMarkEntry = (input: string, maxMark: number): { 
  isValid: boolean; 
  value: string; 
  error?: string;
  isFraction: boolean;
} => {
  if (input === "") return { isValid: true, value: "", isFraction: false };

  const { value, isCalculated, raw } = parseMarkInput(input);
  const num = parseFloat(value);

  if (isNaN(num)) return { isValid: false, value: input, error: "Invalid numeric input", isFraction: false };
  if (num < 0) return { isValid: false, value: input, error: "Negative marks not allowed", isFraction: false };
  
  if (isCalculated) {
    if (num > 100) return { isValid: false, value: input, error: "Calculated percentage exceeds 100%", isFraction: true };
    // Convert percentage back to a raw score for storage
    const scaled = (num / 100) * maxMark;
    return { isValid: true, value: scaled.toFixed(1).replace(/\.0$/, ''), isFraction: true };
  }

  if (num > maxMark) return { isValid: false, value: input, error: `Exceeds assessment total (${maxMark})`, isFraction: false };

  return { isValid: true, value, isFraction: false };
};

/**
 * Checks the structural integrity of a Term's assessments for a specific class.
 * Uses the same core rules as term finalization except moderation sample (omitted here for marksheet/reports views).
 */
export const checkClassTermIntegrity = (
  assessments: Assessment[],
  learners: Learner[],
  marks: AssessmentMark[],
): IntegrityReport => {
  const readiness = validateClassTermForFinalization(
    {
      className: "",
      subject: "",
      assessments,
      learners,
      marks,
      moderationSample: null,
    },
    { skipModerationSample: true },
  );
  const { errors, warnings } = readinessToDisplayLists(readiness);
  const score = Math.max(0, 100 - (errors.length * 25) - (warnings.length * 5));

  return {
    isValid: readiness.isValid,
    score,
    errors,
    warnings,
  };
};