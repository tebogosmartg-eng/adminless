import { useSync } from "@/context/SyncContext";
import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingChanges } = useSync();

  if (isOnline && pendingChanges === 0 && !isSyncing) return null;

  return (
    <div className={cn(
        "fixed bottom-4 right-4 z-50 px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium transition-all duration-300",
        !isOnline ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline mode</span>
          {pendingChanges > 0 && <span className="bg-amber-200 px-1.5 rounded-full">{pendingChanges}</span>}
        </>
      ) : (
        <>
          {isSyncing ? (
             <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
             </>
          ) : (
             <>
                <CloudUpload className="h-3 w-3" />
                <span>{pendingChanges} pending</span>
             </>
          )}
        </>
      )}
    </div>
  );
};