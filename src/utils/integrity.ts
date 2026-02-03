import { Assessment, AssessmentMark, Learner, Term } from "@/lib/types";
import { parseMarkInput } from "./marks";

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
 */
export const checkClassTermIntegrity = (
  assessments: Assessment[], 
  learners: Learner[], 
  marks: AssessmentMark[]
): IntegrityReport => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (assessments.length === 0) {
    return { isValid: true, score: 100, errors: [], warnings: ["No assessments created for this term."] };
  }

  // 1. Weighting Check
  const totalWeight = assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
  if (totalWeight !== 100) {
    errors.push(`Total weighting is ${totalWeight}% (must be 100%).`);
  }

  // 2. Completeness Check
  const totalExpected = assessments.length * learners.length;
  const recorded = marks.filter(m => m.score !== null).length;
  if (recorded < totalExpected) {
    const missing = totalExpected - recorded;
    warnings.push(`${missing} marks are currently missing.`);
  }

  // 3. Bounds Check (Redundancy for imported data)
  assessments.forEach(ass => {
    const assMarks = marks.filter(m => m.assessment_id === ass.id && m.score !== null);
    if (assMarks.some(m => Number(m.score) > ass.max_mark)) {
      errors.push(`Assessment "${ass.title}" contains marks exceeding the total.`);
    }
  });

  const score = Math.max(0, 100 - (errors.length * 25) - (warnings.length * 5));

  return {
    isValid: errors.length === 0,
    score,
    errors,
    warnings
  };
};