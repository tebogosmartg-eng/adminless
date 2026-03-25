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
        const res = await queryFn();
        // React Query v5 throws an error if queryFn returns undefined. 
        // We must map it to null securely.
        return res === undefined ? null : res;
      } catch (e) {
        console.error("Shim liveQuery failed", e);
        return null;
      }
    },
    refetchOnWindowFocus: true, // Keep the data relatively fresh
  });

  // Re-map null back to undefined for the UI components if needed
  return data === null ? undefined : data;
};