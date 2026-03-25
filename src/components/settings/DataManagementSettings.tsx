import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Database, 
    Download, 
    Upload,
    AlertTriangle, 
    Loader2, 
    Calculator, 
    Wind,
    History,
    Merge
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
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
import { useAcademic } from "@/context/AcademicContext";
import { importDemoData } from "@/services/demoData";
import { queueAction } from "@/services/sync";

export const DataManagementSettings = () => {
  const { 
    activeTerm,
    recalculateAllActiveAverages, 
    runDataVacuum 
  } = useAcademic();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!navigator.onLine) {
        showError("Internet connection required for account recovery.");
        return;
    }

    setIsRecovering(true);
    try {
        const { data, error } = await supabase.functions.invoke('account-recovery');
        if (error) throw error;
        
        if (data.success) {
            showSuccess(data.message);
            setTimeout(() => window.location.reload(), 1500); // Reload to pull the recovered data
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
        setTimeout(() => window.location.reload(), 1500);
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
      
      // Fetch all tables for backup
      const tables = [
        'profiles', 'academic_years', 'terms', 'classes', 'learners', 
        'assessments', 'assessment_marks', 'activities', 'todos', 
        'attendance', 'timetable', 'learner_notes', 'evidence', 
        'rubrics', 'lesson_logs', 'curriculum_topics'
      ];
      
      const backupData: any = {
        version: '3.1',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        data: {}
      };

      for (const table of tables) {
          // @ts-ignore
          backupData.data[table] = await db[table].toArray();
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adminless_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
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

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          try {
              const content = event.target?.result as string;
              const backup = JSON.parse(content);
              
              if (!backup.data || !backup.version) {
                  throw new Error("Invalid backup file format.");
              }

              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("User not authenticated.");

              if (!confirm("This will merge backup data with your current local database. Duplicate records will be overwritten. Continue?")) {
                  setIsImporting(false);
                  return;
              }

              await db.transaction('rw', Object.keys(db).filter(k => !k.startsWith('_')), async () => {
                  for (const [table, records] of Object.entries(backup.data)) {
                      if (Array.isArray(records) && records.length > 0) {
                          // Update records to current user ID to ensure ownership
                          const processedRecords = records.map((r: any) => ({
                              ...r,
                              user_id: r.user_id ? user.id : undefined // Only set if the table uses user_id
                          }));

                          // @ts-ignore
                          if (db[table]) {
                              // @ts-ignore
                              await db[table].bulkPut(processedRecords);
                              // Queue for sync
                              await queueAction(table, 'upsert', processedRecords);
                          }
                      }
                  }
              });

              showSuccess("Backup data imported successfully.");
              setTimeout(() => window.location.reload(), 1500);
          } catch (err: any) {
              console.error("Import failed:", err);
              showError("Import failed: " + err.message);
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
          }
      };

      reader.onerror = () => {
          showError("Failed to read the file.");
          setIsImporting(false);
      };

      reader.readAsText(file);
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
            <div className="grid gap-4 md:grid-cols-3">
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
                    <h3 className="font-semibold text-sm">Backup & Restore</h3>
                    <p className="text-xs text-muted-foreground">Download or restore your full local database including all assessments and marks.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileImport} 
                    />
                    <Button onClick={handleImportClick} variant="outline" disabled={isImporting} className="h-9">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Import Backup
                    </Button>
                    <Button onClick={handleExportData} variant="outline" disabled={isExporting} className="h-9">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export Backup
                    </Button>
                </div>
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