import { AssessmentQuestion } from '@/lib/types';

type QuestionMarkValue = number | null;

const normalizeQuestionLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

export const normalizeQuestionMarksForAssessment = (
  rawQuestionMarks: unknown,
  questions: AssessmentQuestion[] = []
): Record<string, QuestionMarkValue> => {
  if (!rawQuestionMarks || typeof rawQuestionMarks !== "object") return {};

  const source = rawQuestionMarks as Record<string, unknown>;
  const normalized: Record<string, QuestionMarkValue> = {};
  const byId = new Map(questions.map((question) => [question.id, question]));
  const byLabel = new Map(
    questions.map((question) => [normalizeQuestionLabel(String(question.question_number ?? "")), question.id])
  );

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    if (typeof rawValue !== "number" || Number.isNaN(rawValue)) return;

    if (byId.has(rawKey)) {
      normalized[rawKey] = rawValue;
      return;
    }

    const key = normalizeQuestionLabel(rawKey);
    const matchedByLabel = byLabel.get(key);
    if (matchedByLabel && normalized[matchedByLabel] === undefined) {
      normalized[matchedByLabel] = rawValue;
      return;
    }

    if (/^\d+$/.test(key)) {
      const index = Number.parseInt(key, 10);
      const zeroBased = questions[index];
      const oneBased = questions[index - 1];
      const matched = zeroBased?.id || oneBased?.id;
      if (matched && normalized[matched] === undefined) {
        normalized[matched] = rawValue;
      }
    }
  });

  return normalized;
};

export const hasMismatchedQuestionMarkKeys = (
  rawQuestionMarks: unknown,
  validQuestionIds: string[]
): boolean => {
  if (!rawQuestionMarks || typeof rawQuestionMarks !== "object") return false;
  const valid = new Set(validQuestionIds);
  return Object.keys(rawQuestionMarks as Record<string, unknown>).some((key) => !valid.has(key));
};

export const canonicalizeQuestionMarksForSave = (
  rawQuestionMarks: unknown,
  questions: AssessmentQuestion[] = []
): {
  canonical: Record<string, number>;
  missingQuestionIds: string[];
  unexpectedKeys: string[];
} => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { canonical: {}, missingQuestionIds: [], unexpectedKeys: [] };
  }

  const normalized = normalizeQuestionMarksForAssessment(rawQuestionMarks, questions);
  const canonical: Record<string, number> = {};

  Object.entries(normalized).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      canonical[key] = value;
    }
  });

  const expectedIds = questions.map((question) => question.id).filter(Boolean);
  const expectedSet = new Set(expectedIds);
  const missingQuestionIds = expectedIds.filter((questionId) => canonical[questionId] === undefined);
  const unexpectedKeys = Object.keys(canonical).filter((key) => !expectedSet.has(key));

  return { canonical, missingQuestionIds, unexpectedKeys };
};

export const remapQuestionMarksByIndexToQuestionIds = (
  rawQuestionMarks: unknown,
  questions: AssessmentQuestion[] = []
): { mapped: Record<string, QuestionMarkValue>; changed: boolean } => {
  if (!rawQuestionMarks || typeof rawQuestionMarks !== "object") {
    return { mapped: {}, changed: false };
  }

  const source = rawQuestionMarks as Record<string, unknown>;
  const questionIds = questions.map((question) => question.id).filter(Boolean);
  const validQuestionIds = new Set(questionIds);
  const mapped: Record<string, QuestionMarkValue> = {};
  let changed = false;

  Object.entries(source).forEach(([rawKey, rawValue], index) => {
    if (typeof rawValue !== "number" || Number.isNaN(rawValue)) return;

    // Already aligned to question.id
    if (validQuestionIds.has(rawKey)) {
      mapped[rawKey] = rawValue;
      return;
    }

    // Migration path: map legacy key position to current question position
    const mappedQuestionId = questionIds[index];
    if (!mappedQuestionId) {
      changed = true;
      return;
    }

    mapped[mappedQuestionId] = rawValue;
    changed = true;
  });

  if (!changed && Object.keys(source).length !== Object.keys(mapped).length) {
    changed = true;
  }

  return { mapped, changed };
};
