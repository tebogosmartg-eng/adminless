"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { pullData, pushChanges } from '@/services/sync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: number;
  pendingChanges: number;
  lastSyncTime: Date | null;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncInProgress = useRef(false);
  
  const pendingChanges = useLiveQuery(() => db.sync_queue.count()) || 0;

  const forceSync = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await pushChanges((p) => setSyncProgress(p)); 
        await pullData(user.id, (p) => setSyncProgress(p)); 
        setLastSyncTime(new Date());
        setSyncProgress(100);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
      // Let the 100% display briefly before resetting
      setTimeout(() => setSyncProgress(0), 1500);
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        toast.success("Connection restored. Synchronizing...");
        forceSync();
    };
    const handleOffline = () => {
        setIsOnline(false);
        toast.info("Offline mode active.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceSync]);

  useEffect(() => {
    let mounted = true;

    const initSync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isOnline && mounted) {
        await forceSync();
      }
    };
    initSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && isOnline && mounted) {
        forceSync();
      }
    });

    const handleFocus = () => {
      if (isOnline && mounted) forceSync();
    };
    window.addEventListener('focus', handleFocus);

    const syncInterval = setInterval(() => {
      if (isOnline && mounted) forceSync();
    }, 30000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(syncInterval);
    };
  }, [isOnline, forceSync]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, syncProgress, pendingChanges, lastSyncTime, forceSync }}>
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