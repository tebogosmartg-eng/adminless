"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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
  const syncInProgress = useRef(false);
  
  const pendingChanges = useLiveQuery(() => db.sync_queue.count()) || 0;

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
  }, []);

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
    if (syncInProgress.current || !isOnline) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await pushChanges(); 
        await pullData(user.id); 
        setLastSyncTime(new Date());
      }
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
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