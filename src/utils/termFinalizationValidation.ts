import type { Assessment, AssessmentMark, Learner, ValidationError } from "@/lib/types";

export type TermFinalizationIssueType = ValidationError["type"];

export interface TermFinalizationIssue {
  type: TermFinalizationIssueType;
  message: string;
}

export interface ClassTermReadinessInput {
  className: string;
  subject: string;
  assessments: Assessment[];
  learners: Learner[];
  marks: AssessmentMark[];
  /** Saved moderation sample for this class/term, or null */
  moderationSample: { learner_ids?: unknown } | null | undefined;
}

export interface ClassTermReadinessOptions {
  /** When true, moderation sample rules are not applied (e.g. marksheet / reports health views). Default false. */
  skipModerationSample?: boolean;
}

/**
 * Single validation profile for class term lock, readiness UI, and term-wide closure.
 * Blocks on: weights ≠ 100, missing marks, marks over max_mark, insufficient moderation sample (when learners exist).
 */
export function validateClassTermForFinalization(
  input: ClassTermReadinessInput,
  options?: ClassTermReadinessOptions,
): { isValid: boolean; issues: TermFinalizationIssue[]; warnings: string[] } {
  const skipModerationSample = !!options?.skipModerationSample;
  const { className, subject, assessments, learners, marks, moderationSample } = input;
  const issues: TermFinalizationIssue[] = [];
  const warnings: string[] = [];

  const learnersWithId = learners.filter((l): l is Learner & { id: string } => !!l.id);

  if (assessments.length === 0) {
    return { isValid: true, issues: [], warnings: ["No assessments created for this term."] };
  }

  const totalWeight = assessments.reduce((sum, a) => sum + Number(a.weight || 0), 0);
  if (totalWeight !== 100) {
    issues.push({
      type: "weight",
      message: `Total weighting is ${totalWeight}% (must be 100%).`,
    });
  }

  assessments.forEach((ass) => {
    const assMarks = marks.filter((m) => m.assessment_id === ass.id && m.score !== null && m.score !== undefined);
    if (assMarks.some((m) => Number(m.score) > ass.max_mark)) {
      issues.push({
        type: "marks",
        message: `Assessment "${ass.title}" contains marks exceeding the total.`,
      });
    }
  });

  if (learnersWithId.length > 0) {
    let missingCount = 0;
    assessments.forEach((ass) => {
      learnersWithId.forEach((l) => {
        const markEntry = marks.find((m) => m.assessment_id === ass.id && m.learner_id === l.id);
        if (!markEntry || markEntry.score === null || markEntry.score === undefined) {
          missingCount++;
        }
      });
    });
    if (missingCount > 0) {
      issues.push({
        type: "marks",
        message: `${missingCount} marks are missing across ${assessments.length} assessments.`,
      });
    }

    const sample = moderationSample;
    const requiredCount = Math.max(1, Math.ceil(learnersWithId.length * 0.1));
    const savedCount = Array.isArray(sample?.learner_ids) ? sample.learner_ids.length : 0;
    if (
      !skipModerationSample &&
      (!sample || savedCount < requiredCount)
    ) {
      issues.push({
        type: "sample",
        message: sample
          ? `Save a moderation sample with at least ${requiredCount} learners for audit (10% of class). Currently ${savedCount} in the saved sample.`
          : `No saved moderation sample for this class. Save a sample with at least ${requiredCount} learners (10% of class) on the class Moderation tab before finalizing.`,
      });
    }
  }

  const isValid = issues.length === 0;
  return { isValid, issues, warnings };
}

export function termFinalizationIssuesToValidationErrors(
  className: string,
  subject: string,
  issues: TermFinalizationIssue[],
): ValidationError[] {
  return issues.map((i) => ({
    type: i.type,
    className,
    subject,
    details: i.message,
  }));
}

/** Flatten issues + warnings into user-facing strings (warnings do not block isValid). */
export function readinessToDisplayLists(result: {
  isValid: boolean;
  issues: TermFinalizationIssue[];
  warnings: string[];
}): { errors: string[]; warnings: string[] } {
  return {
    errors: result.issues.map((i) => i.message),
    warnings: result.warnings,
  };
}
