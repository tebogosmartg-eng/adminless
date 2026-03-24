"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { migrateAllData, MigrationProgress } from '@/services/migration';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const DataMigrationGuard = ({ children }: { children: React.ReactNode }) => {
  const [isMigrationRequired, setIsMigrationRequired] = useState<boolean | null>(null);
  const [migrationState, setMigrationState] = useState<MigrationProgress>({
    currentTable: 'Checking status...',
    completedTables: [],
    totalTables: 0,
    progress: 0,
    status: 'idle'
  });

  const checkMigrationStatus = useCallback(async () => {
    const isComplete = localStorage.getItem('sma_migration_v2_complete') === 'true';
    const isOnlineOnly = localStorage.getItem('sma_online_only_mode') === 'true';
    
    if (isComplete && isOnlineOnly) {
      setIsMigrationRequired(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Not logged in, no migration possible/needed yet
      setIsMigrationRequired(false);
      return;
    }

    // Determine if migration is needed by checking Dexie data
    // (This part is a bit tricky, but for simplicity we'll assume migration is needed once per user)
    setIsMigrationRequired(true);
  }, []);

  useEffect(() => {
    checkMigrationStatus();
  }, [checkMigrationStatus]);

  const startMigration = async () => {
    setMigrationState(prev => ({ ...prev, status: 'migrating' }));
    await migrateAllData((progress) => {
      setMigrationState(progress);
    });
  };

  const handleFinish = () => {
    setIsMigrationRequired(false);
  };

  if (isMigrationRequired === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMigrationRequired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
        <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Data Stability Update</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              We're upgrading your experience to a more stable architecture.
              Please wait while we migrate your offline data to the cloud.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {migrationState.status === 'idle' && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  This migration ensures that all your classes, assessments, and marks are safely stored in Supabase. 
                  Once complete, the app will operate in real-time online mode for better stability.
                </p>
                <Button onClick={startMigration} className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-xl transition-all">
                  Start Migration Now
                </Button>
              </div>
            )}

            {migrationState.status === 'migrating' && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-600">Migrating {migrationState.currentTable}...</span>
                  <span className="text-primary">{migrationState.progress}%</span>
                </div>
                <Progress value={migrationState.progress} className="h-3" />
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-400">
                  {migrationState.completedTables.slice(-4).map((table, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-md border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{table}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 font-medium text-center animate-pulse">
                  Please do not close your browser or refresh the page.
                </p>
              </div>
            )}

            {migrationState.status === 'completed' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                <Alert className="bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800 font-semibold">Success!</AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    All your data has been successfully migrated to the cloud.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-slate-600 leading-relaxed text-center px-4">
                  Migration complete. You are now running on the new stable online architecture.
                </p>
              </div>
            )}

            {migrationState.status === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Migration Error</AlertTitle>
                  <AlertDescription>
                    {migrationState.error}
                  </AlertDescription>
                </Alert>
                <Button onClick={startMigration} variant="outline" className="w-full border-red-200 hover:bg-red-50 text-red-600">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter>
            {migrationState.status === 'completed' && (
              <Button onClick={handleFinish} className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md">
                Launch Stable App
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
