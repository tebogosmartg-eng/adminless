"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    ShieldCheck, 
    History, 
    X, 
    Download, 
    Loader2, 
    Eye 
} from 'lucide-react';
import { ReviewSnapshot } from '@/lib/types';

interface ReviewHeaderProps {
  onBack: () => void;
  activeSnapshotId: string | null;
  snapshots: ReviewSnapshot[];
  onClearSnapshot: () => void;
  isExporting: boolean;
  onExport: () => void;
  className: string;
  termName: string;
}

export const ReviewHeader = ({
  onBack,
  activeSnapshotId,
  snapshots,
  onClearSnapshot,
  isExporting,
  onExport,
  className,
  termName
}: ReviewHeaderProps) => {
  const activeSnapshotName = snapshots.find(s => s.id === activeSnapshotId)?.name;

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-8 h-auto min-h-16 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between no-print shadow-sm gap-2">
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-hidden">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-6 w-px bg-border shrink-0 hidden sm:block" />
          <div className="min-w-0 flex-1">
              <h1 className="text-sm font-black uppercase tracking-widest text-foreground truncate">Portfolio Review Mode</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">{className} • {termName}</p>
          </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {activeSnapshotId && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none gap-2 h-8 px-4 font-black uppercase text-[10px] w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-1.5 min-w-0">
                      <History className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">Snapshot: {activeSnapshotName}</span>
                  </div>
                  <button onClick={onClearSnapshot} className="ml-2 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
              </Badge>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900 text-[9px] font-black uppercase tracking-tighter flex-1 sm:flex-none justify-center">
              <ShieldCheck className="h-3 w-3" />
              Read-Only
          </div>
          <Button onClick={onExport} disabled={isExporting} className="h-9 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export<span className="hidden sm:inline"> Audit PDF</span>
          </Button>
      </div>
    </div>
  );
};