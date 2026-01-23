import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export interface Activity {
  id: string;
  timestamp: string;
  message: string;
}

interface ActivityContextType {
  activities: Activity[];
  logActivity: (message: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
      }
    };

    fetchActivities();
  }, [session?.user.id]);

  const logActivity = useCallback(async (message: string) => {
    if (!session?.user.id) return;

    const newActivity = {
      user_id: session.user.id,
      message,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('activities')
      .insert([newActivity])
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', error);
    } else if (data) {
      setActivities((prev) => [data, ...prev].slice(0, 20));
    }
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