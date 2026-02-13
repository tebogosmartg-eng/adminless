import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Database, 
    Download, 
    AlertTriangle, 
    Loader2, 
    RefreshCw, 
    Calculator, 
    Wind,
    History,
    Merge
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

export const DataManagementSettings = () => {
  const { isOnline, forceSync, isSyncing } = useSync();
  const { 
    activeTerm,
    recalculateAllActiveAverages, 
    runDataVacuum 
  } = useAcademic();

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);

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

  const handleAccountRecovery = async () => {
    if (!isOnline) {
        showError("Internet connection required for account recovery.");
        return;
    }

    setIsRecovering(true);
    try {
        const { data, error } = await supabase.functions.invoke('account-recovery');
        if (error) throw error;
        
        if (data.success) {
            showSuccess(data.message);
            await forceSync(); // Pull the recovered data
        } else {
            showError(data.message || "No historical data found.");
        }
    } catch (e: any) {
        showError("Recovery failed: " + e.message);
    } finally {
        setIsRecovering(false);
    }
  };

  const handleConsolidateData = async () => {
    if (!activeTerm) {
        showError("Please select an active term first.");
        return;
    }

    setIsConsolidating(true);
    try {
        const { data, error } = await supabase.functions.invoke('academic-reset', {
            body: { term1Id: activeTerm.id }
        });
        if (error) throw error;

        showSuccess(data.message);
        await forceSync();
    } catch (e: any) {
        showError("Consolidation failed.");
    } finally {
        setIsConsolidating(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
        const { yearId, activeTermId } = await importDemoData();
        localStorage.setItem('adminless_active_year_id', yearId);
        localStorage.setItem('adminless_active_term_id', activeTermId);
        await recalculateAllActiveAverages(true);
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
      await db.delete();
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
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle>Demo Environment</CardTitle>
                    <CardDescription>Populate your account with demo data to explore all features instantly.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleLoadDemo} disabled={isDemoLoading} className="w-full font-bold">
                        {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Full Demo Context"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600" />
                        Account Recovery
                    </CardTitle>
                    <CardDescription>Restore data if you previously signed in with a different provider (e.g. Google vs Email).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleAccountRecovery} disabled={isRecovering} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 font-bold">
                        {isRecovering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Merge className="mr-2 h-4 w-4" />}
                        Restore Historical Data
                    </Button>
                </CardContent>
            </Card>
        </div>

        <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Data Maintenance</CardTitle>
            </div>
            <CardDescription>Maintain data integrity and manage backups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Repair Averages</h3>
                        <p className="text-[10px] text-muted-foreground">Recalculates summary marks based on assessment history.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRepairing} className="w-full mt-auto h-9">
                        {isRepairing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5 mr-2" />}
                        Repair
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Data Vacuum</h3>
                        <p className="text-[10px] text-muted-foreground">Removes orphaned marks and corrupted duplicates.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleVacuum} disabled={isVacuuming} className="w-full mt-auto h-9">
                        {isVacuuming ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wind className="h-3.5 w-3.5 mr-2" />}
                        Purge
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Force Sync</h3>
                        <p className="text-[10px] text-muted-foreground">Manually push pending changes and pull latest data.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={forceSync} disabled={isSyncing || !isOnline} className="w-full mt-auto h-9">
                        {isSyncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                        Sync
                    </Button>
                </div>
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm mb-1">Consolidate</h3>
                        <p className="text-[10px] text-muted-foreground">Force all records into the current active Term context.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleConsolidateData} disabled={isConsolidating} className="w-full mt-auto h-9">
                        {isConsolidating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5 mr-2" />}
                        Consolidate
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                    <h3 className="font-semibold text-sm">Backup Local Data</h3>
                    <p className="text-xs text-muted-foreground">Download a JSON file containing your local database state.</p>
                </div>
                <Button onClick={handleExportData} variant="outline" disabled={isExporting} className="h-9">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export Backup
                </Button>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-destructive/20 rounded-lg bg-red-50 dark:bg-red-950/10">
                <div className="space-y-0.5">
                    <h3 className="font-semibold text-sm text-destructive">Danger Zone</h3>
                    <p className="text-xs text-muted-foreground">Wipe all local data. Does not affect cloud storage.</p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isClearing} size="sm">
                        <AlertTriangle className="mr-2 h-4 w-4" /> Reset Local App
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will delete your local cache. If you have unsynced changes, they will be lost.</AlertDialogDescription>
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