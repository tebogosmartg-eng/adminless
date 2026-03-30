import { Loader2 } from "lucide-react";

export const LoadingScreen = () => (
  <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading your workspace...</p>
    </div>
  </div>
);