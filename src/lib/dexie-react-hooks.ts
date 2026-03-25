import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLiveQuery = <T = any>(queryFn: () => Promise<T> | T, deps: any[] = []): T | undefined => {
  // We use React Query to fetch the data directly from Supabase via our db shim
  // The cache key incorporates the function string and the dependencies.
  const queryKey = ['liveQuery', queryFn.toString(), ...deps];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (e) {
        console.error("Shim liveQuery failed", e);
        return undefined;
      }
    },
    refetchOnWindowFocus: true, // Keep the data relatively fresh
  });

  return data;
};
