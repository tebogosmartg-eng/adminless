import { createContext, useContext, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { Activity } from '@/lib/types';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';

interface ActivityContextType {
  activities: Activity[];
  logActivity: (message: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  
  // Live Query from Dexie
  const activities = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    return db.activities
        .orderBy('timestamp')
        .reverse()
        .limit(20)
        .toArray();
  }, [session?.user.id]) || [];

  const logActivity = useCallback(async (message: string) => {
    if (!session?.user.id) return;

    const newActivity = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      message,
      timestamp: new Date().toISOString(),
    };

    // 1. Save Local
    await db.activities.add(newActivity);

    // 2. Queue Sync
    await queueAction('activities', 'create', newActivity);

  }, [session?.user.id]);

  return (
    <ActivityContext.Provider value={{ activities, logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};