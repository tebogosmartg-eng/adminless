"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { pullData, pushChanges } from '@/services/sync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const pendingChanges = useLiveQuery(() => db.sync_queue.count()) || 0;

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        toast.success("Back online. Syncing...");
        forceSync();
    };
    const handleOffline = () => {
        setIsOnline(false);
        toast.info("You are offline. Changes will be saved locally.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Self-Healing / Account Recovery Trigger
  useEffect(() => {
    const runRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !isOnline) return;

      // Only check if the local database is currently empty
      const localClassCount = await db.classes.count();
      if (localClassCount === 0) {
          console.log("[Recovery] App appears empty. Checking for historical data linkage...");
          
          try {
              const { data, error } = await supabase.functions.invoke('account-recovery');
              if (!error && data?.success && data?.migratedCount > 0) {
                  toast.success(data.message, { duration: 10000 });
                  // Re-pull data now that IDs are fixed
                  await pullData(session.user.id);
                  window.location.reload();
              }
          } catch (e) {
              console.error("[Recovery] Silent check failed:", e);
          }
      }
    };

    runRecovery();
  }, [isOnline]);

  useEffect(() => {
    const initSync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isOnline) {
        await forceSync();
      }
    };
    initSync();
  }, []);

  const forceSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await pushChanges(); 
        await pullData(user.id); 
        setLastSyncTime(new Date());
      }
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingChanges, lastSyncTime, forceSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};