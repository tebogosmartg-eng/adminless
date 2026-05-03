type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

const isSupabaseLikeError = (value: unknown): value is SupabaseLikeError => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SupabaseLikeError;
  return (
    typeof candidate.message === "string" ||
    typeof candidate.code === "string" ||
    typeof candidate.details === "string" ||
    typeof candidate.hint === "string"
  );
};

const serializeUnknownError = (error: unknown): { message: string; stack?: string; details?: Record<string, unknown> } => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (isSupabaseLikeError(error)) {
    const candidate = error as SupabaseLikeError;
    const messageParts = [candidate.message, candidate.details, candidate.hint]
      .filter((part): part is string => typeof part === "string" && part.length > 0);
    const message = messageParts.length > 0 ? messageParts.join(" — ") : "Unknown error";
    const details: Record<string, unknown> = {};
    if (candidate.code !== undefined) details.code = candidate.code;
    if (candidate.details !== undefined) details.details = candidate.details;
    if (candidate.hint !== undefined) details.hint = candidate.hint;
    return { message, details: Object.keys(details).length > 0 ? details : undefined };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
};

export function logAdminLessError(
  feature: string,
  error: unknown,
  context?: Record<string, any>
) {
  const serialized = serializeUnknownError(error);
  console.error("[AdminLess Error]", {
    feature,
    message: serialized.message,
    stack: serialized.stack,
    details: serialized.details,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Tag an error so an outer catch knows it has already been logged via
 * `logAdminLessError`. Useful when a deeper layer logs the original error
 * (with rich context) and a wrapper layer would otherwise re-log a stripped
 * version of the same failure.
 */
export const markErrorLogged = (error: unknown, feature: string): void => {
  if (error && typeof error === "object") {
    (error as { __loggedAt?: string }).__loggedAt = feature;
  }
};

export const wasErrorLogged = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return typeof (error as { __loggedAt?: string }).__loggedAt === "string";
};
