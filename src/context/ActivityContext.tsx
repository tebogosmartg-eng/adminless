import { createContext, useContext, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { Activity } from '@/lib/types';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademic } from './AcademicContext';

interface ActivityContextType {
  activities: Activity[];
  logActivity: (message: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { activeYear, activeTerm } = useAcademic();
  
  // Strict Isolation: Query by term_id
  const activities = useLiveQuery(async () => {
    if (!session?.user.id || !activeTerm) return [];
    return db.activities
        .where('term_id')
        .equals(activeTerm.id)
        .reverse()
        .limit(20)
        .toArray();
  }, [session?.user.id, activeTerm?.id]) || [];

  const logActivity = useCallback(async (message: string) => {
    if (!session?.user.id || !activeYear || !activeTerm) return;

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      year_id: activeYear.id,
      term_id: activeTerm.id,
      message,
      timestamp: new Date().toISOString(),
    };

    // 1. Save Local
    await db.activities.add(newActivity);

    // 2. Queue Sync
    await queueAction('activities', 'create', newActivity);

  }, [session?.user.id, activeYear?.id, activeTerm?.id]);

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