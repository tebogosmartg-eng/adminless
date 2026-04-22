import { supabase } from '@/lib/supabaseClient';

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  // Legacy sync queue disabled.
  // The application now uses a Write-Through Architecture directly to Supabase.
  // This stub prevents duplicate writes and race conditions from older hooks.
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Sync Stub] Ignored legacy queue action for ${table} (${action}). Data is now handled via direct Supabase writes.`);
  }

  return Promise.resolve();
};