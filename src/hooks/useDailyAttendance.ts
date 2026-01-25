import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDailyAttendance = () => {
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('attendance')
          .select('status')
          .eq('date', today)
          .eq('user_id', user.id);
          
        if (data) {
          const counts = data.reduce((acc: any, curr: any) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            acc.total++;
            return acc;
          }, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
          setStats(counts);
        }
      }
      setLoading(false);
    };

    fetchTodayAttendance();
  }, []);

  return { stats, loading };
};