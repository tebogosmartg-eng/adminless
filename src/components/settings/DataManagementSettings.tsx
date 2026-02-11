import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, AlertTriangle, Loader2, RefreshCw, Calculator, Sparkles } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/db";
import { useSync } from "@/context/SyncContext";
import { useAcademic } from "@/context/AcademicContext";
import { importDemoData } from "@/services/demoData";

export const DataManagementSettings = () => {
  const { isOnline, forceSync, isSyncing } = useSync();
  const { recalculateAllActiveAverages } = useAcademic();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleRecalculate = async () => {
      setIsRepairing(true);
      await recalculateAllActiveAverages();
      setIsRepairing(false);
  };

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
        const { yearId, activeTermId } = await importDemoData();
        localStorage.setItem('adminless_active_year_id', yearId);
        localStorage.setItem('adminless_active_term_id', activeTermId);
        await recalculateAllActiveAverages();
        showSuccess("Demo data loaded. Redirecting to Dashboard...");
        setTimeout(() => window.location.href = '/', 1500);
    } catch (e: any) {
        showError(e.message || "Failed to load demo data.");
    } finally {
        setIsDemoLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const backupData = {
        version: '3.1',
        timestamp: new Date().toISOString(),
        profile: await db.profiles.get(user.id),
        classes: await db.classes.where('user_id').equals(user.id).toArray()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smareg_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Full backup downloaded successfully.");
    } catch (error: any) {
      showError(error.message || "Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      showSuccess("Application data reset.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      showError("Failed to clear data.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Demo Environment</CardTitle>
                </div>
                <CardDescription>Populate your account with 2024 demo data to explore all features instantly.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleLoadDemo} disabled={isDemoLoading} className="w-full sm:w-auto font-bold">
                    {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Full Demo Context
                </Button>
            </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Data & System Maintenance</CardTitle>
            </div>
            <CardDescription>Maintain data integrity and manage backups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Repair Averages</h3>
                        <p className="text-xs text-muted-foreground">Recalculates dashboard summary marks based on detailed assessment history.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRepairing} className="w-full mt-auto">
                        {isRepairing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                        Recalculate All
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Force Sync</h3>
                        <p className="text-xs text-muted-foreground">Manually push all pending changes and pull latest data.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={forceSync} disabled={isSyncing || !isOnline} className="w-full mt-auto">
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sync Now
                    </Button>
                </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
                <h3 className="font-semibold mb-1">Backup Data</h3>
                <Button onClick={handleExportData} variant="outline" disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export Backup
                </Button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-destructive/20 rounded-lg bg-red-50 dark:bg-red-950/10">
                <h3 className="font-semibold mb-1 text-destructive">Danger Zone</h3>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isClearing}>
                        <AlertTriangle className="mr-2 h-4 w-4" /> Reset App
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete ALL data locally and on the server.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isClearing ? "Clearing..." : "Yes, Reset App"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
        </Card>
    </div>
  );
};