import { useSync } from "@/context/SyncContext";
import { WifiOff, RefreshCw, CloudUpload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, syncProgress, pendingChanges } = useSync();
  const [showSynced, setShowSynced] = useState(false);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);
  const isOnlineOnly = localStorage.getItem('sma_online_only_mode') === 'true';

  useEffect(() => {
    if (isSyncing) {
      setHasInitialSynced(true);
    } else if (hasInitialSynced && pendingChanges === 0 && isOnline) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, pendingChanges, isOnline, hasInitialSynced]);

  if (isOnline && pendingChanges === 0 && !isSyncing && !showSynced) return null;
  if (isOnlineOnly && isOnline && !isSyncing) return null; // Don't show in online-only mode unless syncing or offline

  return (
    <div className={cn(
        "fixed bottom-4 right-4 z-[9999] px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium transition-all duration-300",
        !isOnline ? "bg-amber-100 text-amber-800 border border-amber-200" 
        : isSyncing ? "bg-blue-100 text-blue-800 border border-blue-200"
        : pendingChanges > 0 ? "bg-amber-100 text-amber-800 border border-amber-200"
        : "bg-green-100 text-green-800 border border-green-200 opacity-90 scale-95"
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline mode</span>
          {pendingChanges > 0 && <span className="bg-amber-200 px-1.5 rounded-full text-[10px]">{pendingChanges}</span>}
        </>
      ) : isSyncing ? (
        <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing... {syncProgress > 0 ? `${syncProgress}%` : ''}</span>
        </>
      ) : pendingChanges > 0 ? (
         <>
            <CloudUpload className="h-3 w-3" />
            <span>{pendingChanges} pending</span>
         </>
      ) : (
         <>
            <CheckCircle2 className="h-3 w-3" />
            <span>Synced</span>
         </>
      )}
    </div>
  );
};