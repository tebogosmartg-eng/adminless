import type { DefaultOptions } from "@tanstack/react-query";

/** Shared React Query retry: no retries on timeouts or AbortError; otherwise at most 2 retries. */
export function queryRetry(failureCount: number, error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return false;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  ) {
    return false;
  }
  const msg = String((error as Error)?.message ?? "");
  if (msg.includes("timed out")) return false;
  return failureCount < 2;
}

/** Default query options applied via QueryClient in App. Per-query hooks may override selectively. */
export const defaultQueryOptions: Pick<
  NonNullable<DefaultOptions["queries"]>,
  "staleTime" | "refetchOnWindowFocus" | "retry"
> = {
  staleTime: 0,
  refetchOnWindowFocus: false,
  retry: queryRetry,
};
