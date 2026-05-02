export function logAdminLessError(
  feature: string,
  error: unknown,
  context?: Record<string, any>
) {
  console.error("[AdminLess Error]", {
    feature,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  });
}
