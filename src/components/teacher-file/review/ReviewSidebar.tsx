"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Search, 
    History, 
    X, 
    Sparkles,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewSnapshot, TeacherFileTemplateSection } from '@/lib/types';

interface ReviewSidebarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedSectionId: string;
  onSectionSelect: (id: string) => void;
  sections: TeacherFileTemplateSection[];
  portfolioOnly: boolean;
  onPortfolioOnlyChange: (val: boolean) => void;
  activeSnapshotId: string | null;
  onSnapshotSelect: (id: string) => void;
  isBuildingSnapshot: boolean;
  onSetBuildingSnapshot: (val: boolean) => void;
  snapshotName: string;
  onSnapshotNameChange: (val: string) => void;
  onSaveSnapshot: () => void;
  snapshots: ReviewSnapshot[];
  onDeleteSnapshot: (id: string) => void;
}

export const ReviewSidebar = (props: ReviewSidebarProps) => {
  return (
    <aside className="w-full lg:w-72 space-y-8 no-print">
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Review Curation</h3>
            
            <div className="space-y-2">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase">Search Content</Label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        value={props.search} 
                        onChange={e => props.onSearchChange(e.target.value)} 
                        disabled={!!props.activeSnapshotId}
                        className="h-9 pl-8 text-xs bg-white" 
                        placeholder="Keywords..."
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase">Section Scope</Label>
                <div className="grid gap-1">
                    <button 
                        disabled={!!props.activeSnapshotId}
                        onClick={() => props.onSectionSelect('all')}
                        className={cn(
                            "text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                            props.selectedSectionId === 'all' ? "bg-primary text-white" : "bg-white hover:bg-slate-100 border"
                        )}
                    >
                        All Sections
                    </button>
                    {props.sections.map(s => (
                        <button 
                            key={s.id}
                            disabled={!!props.activeSnapshotId}
                            onClick={() => props.onSectionSelect(s.id)}
                            className={cn(
                                "text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors truncate",
                                props.selectedSectionId === s.id ? "bg-primary text-white" : "bg-white hover:bg-slate-100 border"
                            )}
                        >
                            {s.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Portfolio Only</Label>
                    <input 
                        type="checkbox" 
                        disabled={!!props.activeSnapshotId}
                        checked={props.portfolioOnly} 
                        onChange={e => props.onPortfolioOnlyChange(e.target.checked)}
                        className="h-4 w-4 accent-green-600"
                    />
                </div>
            </div>

            {!props.activeSnapshotId && (
                <div className="pt-6">
                    {props.isBuildingSnapshot ? (
                        <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in zoom-in duration-300">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Snapshot Name</Label>
                            <Input 
                                value={props.snapshotName} 
                                onChange={e => props.onSnapshotNameChange(e.target.value)} 
                                className="h-8 text-xs"
                                placeholder="e.g. Term 3 Moderation Set"
                                autoFocus
                            />
                            <div className="flex gap-1 pt-1">
                                <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-black flex-1" onClick={() => props.onSetBuildingSnapshot(false)}>Cancel</Button>
                                <Button size="sm" className="h-7 text-[9px] uppercase font-black flex-1" onClick={props.onSaveSnapshot} disabled={!props.snapshotName.trim()}>Save Set</Button>
                            </div>
                        </div>
                    ) : (
                        <Button 
                            variant="outline" 
                            className="w-full h-10 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 font-black text-[10px] uppercase tracking-widest gap-2"
                            onClick={() => props.onSetBuildingSnapshot(true)}
                        >
                            <Sparkles className="h-3 w-3" /> Build Review Pack
                        </Button>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <History className="h-3 w-3" /> Saved Review Sets
            </h3>
            <div className="grid gap-2">
                {props.snapshots.map(snap => (
                    <div key={snap.id} className={cn(
                        "group p-3 rounded-xl border transition-all flex flex-col gap-2",
                        props.activeSnapshotId === snap.id ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "bg-white hover:border-slate-300"
                    )}>
                        <div className="flex justify-between items-start">
                            <button 
                                onClick={() => props.onSnapshotSelect(snap.id)}
                                className="flex-1 text-left"
                            >
                                <p className="text-xs font-black text-slate-900 leading-tight truncate">{snap.name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">{snap.entry_ids.length} entries</p>
                            </button>
                            <button 
                                onClick={() => props.onDeleteSnapshot(snap.id)}
                                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {props.snapshots.length === 0 && (
                    <p className="text-[9px] text-muted-foreground italic text-center py-4">No snapshots created.</p>
                )}
            </div>
        </div>
    </aside>
  );
};