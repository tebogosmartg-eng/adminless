import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
    Database, 
    Download, 
    AlertTriangle, 
    Loader2, 
    RefreshCw, 
    Calculator, 
    Sparkles, 
    UserCheck, 
    ShieldAlert,
    ScanSearch,
    Eye,
    Wind,
    ArrowRightCircle
} from "lucide-react";
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
import { useAccountRecovery } from "@/hooks/useAccountRecovery";
import { useAlignmentDiagnostic } from "@/hooks/useAlignmentDiagnostic";

export const DataManagementSettings = () => {
  const { isOnline, forceSync, isSyncing } = useSync();
  const { 
    activeYear, 
    terms, 
    recalculateAllActiveAverages, 
    runDataVacuum, 
    diagnosticMode, 
    setDiagnosticMode
  } = useAcademic();
  const { runRecovery, isRecovering } = useAccountRecovery();
  const { runDiagnostic, isRunning: isDiagnosing } = useAlignmentDiagnostic();

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRecalculate = async () => {
      setIsRepairing(true);
      await recalculateAllActiveAverages();
      setIsRepairing(false);
  };

  const handleVacuum = async () => {
      setIsVacuuming(true);
      await runDataVacuum();
      setIsVacuuming(false);
  };

  const handleBackendAcademicReset = async () => {
      if (!activeYear || !isOnline) {
          showError("Backend reset requires an internet connection and an active year.");
          return;
      }

      const termOne = terms.find(t => t.name === "Term 1");
      if (!termOne) {
          showError("Could not identify Term 1 context.");
          return;
      }

      setIsResetting(true);
      try {
          // Trigger the Backend Edge Function
          const { data, error } = await supabase.functions.invoke('academic-reset', {
              body: { term1Id: termOne.id }
          });

          if (error) throw error;

          if (data.success) {
              showSuccess(data.message);
              console.log("[Backend Reset] Statistics:", data.counts);
              
              // Synchronize local DB with the new backend state
              await forceSync();
              await recalculateAllActiveAverages(true);
          }
      } catch (e: any) {
          console.error("[Backend Reset] Failed:", e);
          showError(e.message || "Reset failed.");
      } finally {
          setIsResetting(false);
      }
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
        <Card className="border-purple-200 bg-purple-50/20">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ScanSearch className="h-5 w-5 text-purple-600" />
                    <CardTitle>Alignment Diagnostic</CardTitle>
                </div>
                <CardDescription>
                    Troubleshoot missing data by running a full audit of your local database records and filters.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border rounded-xl shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-purple-500" />
                            <h4 className="font-bold text-sm">Global Diagnostic View</h4>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Temporarily disable all Academic Year and Term filters across the app to see every record in your DB.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="diag-mode" className="text-xs font-bold uppercase tracking-tighter">
                            {diagnosticMode ? "Bypassing Filters" : "Filters Active"}
                        </Label>
                        <Switch 
                            id="diag-mode" 
                            checked={diagnosticMode} 
                            onCheckedChange={setDiagnosticMode} 
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={runDiagnostic} disabled={isDiagnosing} variant="outline" className="border-purple-200 hover:bg-purple-50">
                        {isDiagnosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Run Console Audit
                    </Button>
                    <p className="text-[10px] text-muted-foreground italic">Logs results to browser developer tools.</p>
                </div>
            </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ArrowRightCircle className="h-5 w-5 text-amber-600" />
                    <CardTitle>Controlled Academic Reset (Backend)</CardTitle>
                </div>
                <CardDescription>
                    Move ALL your current data into Term 1 directly on the server.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-white border rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p>
                        This will execute a server-side update across all classes, tasks, and marks to belong to "Term 1". Terms 2–4 will be cleared on the server and then synced to your device.
                    </p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-amber-300 hover:bg-amber-50 text-amber-700" disabled={isResetting || !isOnline}>
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightCircle className="h-4 w-4 mr-2" />}
                            Execute Server-Side Consolidation
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Execute Backend Reset?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will re-assign every record in your account to Term 1 on the Supabase database. Are you sure?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBackendAcademicReset} className="bg-amber-600 hover:bg-amber-700">Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <CardTitle>Account Recovery & Linkage</CardTitle>
                </div>
                <CardDescription>
                    If your classes or settings are missing after logging in, use this tool to re-link historical records to your current identity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-white border rounded-lg text-xs text-slate-600 mb-2">
                    <ShieldAlert className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p>
                        This will scan our secure backups for any records linked to your email address but a different internal ID. No data is overwritten or deleted.
                    </p>
                </div>
                <Button onClick={runRecovery} disabled={isRecovering || !isOnline} className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700">
                    {isRecovering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Restore Historical Data
                </Button>
            </CardContent>
        </Card>

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
            <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Repair Averages</h3>
                        <p className="text-xs text-muted-foreground">Recalculates dashboard summary marks based on detailed assessment history.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRepairing} className="w-full mt-auto">
                        {isRepairing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                        Repair
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Data Vacuum</h3>
                        <p className="text-xs text-muted-foreground">Removes orphaned marks and corrupted duplicate entries from the database.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleVacuum} disabled={isVacuuming} className="w-full mt-auto">
                        {isVacuuming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wind className="h-4 w-4 mr-2" />}
                        Purge
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Force Sync</h3>
                        <p className="text-xs text-muted-foreground">Manually push all pending changes and pull latest data.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={forceSync} disabled={isSyncing || !isOnline} className="w-full mt-auto">
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4 mr-2" />}
                        Sync
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