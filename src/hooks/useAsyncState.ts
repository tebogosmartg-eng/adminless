import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AsyncStatusValue = "idle" | "loading" | "saving" | "success" | "error";

type LastAction = () => Promise<unknown>;

interface RunOptions {
  status?: "loading" | "saving";
  userInitiated?: boolean;
  /** Per-call timeout (ms). Omit to use hook default; 0 disables. */
  timeoutMs?: number;
  /** Combined with an internal controller: aborted when a new run starts, on unmount, or when this signal aborts. */
  signal?: AbortSignal;
}

export interface AsyncStateHandle {
  status: AsyncStatusValue;
  error: string | null;
  hasUserSaved: boolean;
  run: <T>(fn: () => Promise<T>, options?: RunOptions) => Promise<T>;
  retry: () => Promise<void>;
  resetUserSaved: () => void;
}

interface UseAsyncStateOptions {
  successDurationMs?: number;
  resetOnChangeKey?: string;
  /** Default timeout for each run() (ms). Omit or 0 = wait indefinitely. */
  defaultTimeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error("Request timed out.")), ms);
    promise.then(
      (v) => {
        window.clearTimeout(id);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(id);
        reject(e);
      },
    );
  });
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export const useAsyncState = (_options: UseAsyncStateOptions = {}): AsyncStateHandle => {
  const successDurationMs = Math.max(0, _options.successDurationMs ?? 1500);
  const defaultTimeoutMs = Math.max(0, _options.defaultTimeoutMs ?? 0);
  const resetOnChangeKey = _options.resetOnChangeKey;
  const [status, setStatus] = useState<AsyncStatusValue>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasUserSaved, setHasUserSaved] = useState(false);
  const lastActionRef = useRef<LastAction | null>(null);
  const lastRunOptionsRef = useRef<RunOptions | undefined>(undefined);
  const successTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const runGenerationRef = useRef(0);
  const runAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runAbortRef.current?.abort();
    };
  }, []);

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const run = useCallback(
    async <T>(fn: () => Promise<T>, options?: RunOptions): Promise<T> => {
      runAbortRef.current?.abort();
      const ac = new AbortController();
      runAbortRef.current = ac;
      const myGen = ++runGenerationRef.current;

      clearSuccessTimer();
      lastActionRef.current = fn;
      lastRunOptionsRef.current = options;
      const nextStatus = options?.status ?? "saving";
      const isLoadOperation = nextStatus === "loading";
      const isUserInitiatedSave = options?.userInitiated ?? !isLoadOperation;

      if (isUserInitiatedSave) {
        setHasUserSaved(true);
      } else if (isLoadOperation) {
        setHasUserSaved(false);
      }

      setStatus(nextStatus);
      setError(null);

      const timeoutMs =
        options?.timeoutMs !== undefined ? Math.max(0, options.timeoutMs) : defaultTimeoutMs;

      const racers: Promise<unknown>[] = [
        withTimeout(fn(), timeoutMs),
        abortPromise(ac.signal),
      ];
      if (options?.signal) {
        racers.push(abortPromise(options.signal));
      }

      try {
        const result = (await Promise.race(racers)) as T;
        if (myGen !== runGenerationRef.current || !mountedRef.current) return result;
        if (isUserInitiatedSave) {
          setStatus("success");
          successTimerRef.current = window.setTimeout(() => {
            if (mountedRef.current) setStatus("idle");
          }, successDurationMs);
        } else {
          setStatus("idle");
        }
        return result;
      } catch (err) {
        if (myGen !== runGenerationRef.current) throw err;
        if (!mountedRef.current) throw err;
        if (isAbortError(err)) throw err;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to complete action.");
        throw err;
      }
    },
    [clearSuccessTimer, successDurationMs, defaultTimeoutMs],
  );

  const retry = useCallback(async () => {
    if (!lastActionRef.current) return;
    await run(lastActionRef.current, lastRunOptionsRef.current);
  }, [run]);

  const resetUserSaved = useCallback(() => {
    setHasUserSaved(false);
  }, []);

  useEffect(() => {
    return () => {
      clearSuccessTimer();
    };
  }, [clearSuccessTimer]);

  useEffect(() => {
    runAbortRef.current?.abort();
    lastActionRef.current = null;
    lastRunOptionsRef.current = undefined;
    clearSuccessTimer();
    setStatus("idle");
    setError(null);
    setHasUserSaved(false);
  }, [resetOnChangeKey, clearSuccessTimer]);

  return useMemo(
    () => ({
      status,
      error,
      hasUserSaved,
      run,
      retry,
      resetUserSaved,
    }),
    [status, error, hasUserSaved, run, retry, resetUserSaved],
  );
};
