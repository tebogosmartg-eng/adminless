"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSync } from '@/context/SyncContext';

export const useAccountRecovery = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const { forceSync } = useSync();

  const runRecovery = async () => {
    setIsRecovering(true);
    try {
      console.log("[Recovery] Initiating account linkage audit...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found.");

      console.log(`[Recovery] Current UUID: ${session.user.id}`);
      console.log(`[Recovery] Email: ${session.user.email}`);

      // Call the edge function that handles the admin-level re-linking
      const { data, error } = await supabase.functions.invoke('account-recovery', {
        body: {}
      });

      if (error) throw error;

      if (data?.success && data.migratedCount > 0) {
        showSuccess(data.message);
        console.log(`[Recovery] Success: Linked ${data.migratedCount} classes to current ID.`);
        
        // Force a pull to bring the newly linked data into the local Dexie DB
        await forceSync();
        
        // Reload to refresh all contexts
        setTimeout(() => window.location.reload(), 2000);
      } else {
        showSuccess("Audit complete. No disconnected records found for this email.");
      }
    } catch (err: any) {
      console.error("[Recovery] Failed:", err);
      showError(err.message || "Recovery process failed.");
    } finally {
      setIsRecovering(false);
    }
  };

  return { runRecovery, isRecovering };
};