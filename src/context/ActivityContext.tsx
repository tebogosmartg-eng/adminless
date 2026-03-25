import { createContext, useContext, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { Activity } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAcademic } from './AcademicContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ActivityContextType {
  activities: Activity[];
  logActivity: (message: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children, session }: { children: ReactNode; session: Session | null }) => {
  const { activeYear, activeTerm } = useAcademic();
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', session?.user?.id, activeTerm?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      let query = supabase.from('activities')
          .select('*')
          .eq('user_id', session.user.id)
          .order('timestamp', { ascending: false })
          .limit(20);
      
      if (activeTerm) {
        query = query.or(`term_id.eq.${activeTerm.id},term_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!session?.user?.id
  });

  const logActivityMutation = useMutation({
    mutationFn: async (message: string) => {
        if (!session?.user?.id || !activeYear || !activeTerm) return;
        const newActivity = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            year_id: activeYear.id,
            term_id: activeTerm.id,
            message,
            timestamp: new Date().toISOString(),
        };
        const { error } = await supabase.from('activities').insert(newActivity);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['activities'] });
    }
  });

  const logActivity = useCallback((message: string) => {
    logActivityMutation.mutate(message);
  }, [logActivityMutation]);

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