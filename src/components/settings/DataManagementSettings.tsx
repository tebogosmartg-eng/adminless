import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useState } from "react";
import { useAcademic } from "@/context/AcademicContext";
import { importDemoData } from "@/services/demoData";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { useAsyncState } from "@/hooks/useAsyncState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const DataManagementSettings = () => {
  const { recalculateAllActiveAverages } = useAcademic();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const demoState = useAsyncState();

  const handleLoadDemo = async () => {
    try {
      await demoState.run(async () => {
        const { yearId, activeTermId } = await importDemoData();
        localStorage.setItem("adminless_active_year_id", yearId);
        localStorage.setItem("adminless_active_term_id", activeTermId);
        await recalculateAllActiveAverages(true);
      }, { status: "saving" });
      showSuccess("Saved ✓");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (e: any) {
      showError(e.message || "Failed - Retry");
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
        <AsyncStatus
          state={{
            status: demoState.status,
            error: demoState.error,
            retry: demoState.retry,
          }}
        />
        <Card className="border-primary/20 bg-primary/5 w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Demo Environment
                </CardTitle>
                <CardDescription>Populate your account with demo data to explore all features instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use demo data only when you want to reset your workspace to a sample environment.
                </p>
                <Button onClick={() => setConfirmOpen(true)} disabled={demoState.status === "saving"} className="w-full sm:w-auto h-10 font-bold">
                    {demoState.status === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Demo Context"}
                </Button>
            </CardContent>
        </Card>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This may overwrite your current academic context and demo values will become active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLoadDemo}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};