import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { AsyncStatusValue } from "@/hooks/useAsyncState";

interface AsyncStatusProps {
  state: {
    status: AsyncStatusValue;
    error: string | null;
    hasUserSaved?: boolean;
    retry: () => Promise<void> | void;
  };
  loadingLabel?: string;
  savingLabel?: string;
  successLabel?: string;
}

export const AsyncStatus = ({
  state,
  loadingLabel = "Loading...",
  savingLabel = "Saving...",
  successLabel = "Saved ✓",
}: AsyncStatusProps) => {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    const message = state.error?.trim() || "Failed to complete action.";
    return (
      <Alert variant="destructive" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void state.retry()}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (state.status === "success" && state.hasUserSaved !== false) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>{successLabel}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-800">
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertDescription>{state.status === "loading" ? loadingLabel : savingLabel}</AlertDescription>
    </Alert>
  );
};
