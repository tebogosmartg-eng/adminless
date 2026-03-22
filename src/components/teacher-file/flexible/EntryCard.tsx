"use client";

import React, { useState } from 'react';
import { TeacherFileEntry, EntryVisibility } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
    MoreVertical, 
    Trash2, 
    ShieldCheck, 
    Eye, 
    Lock, 
    Save, 
    X,
    MessageSquare,
    Tag as TagIcon,
    UserCheck,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { EntryAttachmentManager } from './EntryAttachmentManager';

interface EntryCardProps {
  entry: TeacherFileEntry;
  isLocked: boolean;
  onUpdate: (id: string, updates: Partial<TeacherFileEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EntryCard = ({ entry, isLocked, onUpdate, onDelete }: EntryCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title || "");
  const [editContent, setEditContent] = useState(entry.content || "");
  const [newTag, setNewTag] = useState("");

  const handleSave = async () => {
    await onUpdate(entry.id, { title: editTitle, content: editContent });
    setIsEditing(false);
  };

  const handleTogglePortfolio = () => {
    const next: EntryVisibility = entry.visibility === 'portfolio' ? 'private' : 'portfolio';
    onUpdate(entry.id, { visibility: next });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const currentTags = entry.tags || [];
    if (!currentTags.includes(newTag.trim())) {
        onUpdate(entry.id, { tags: [...currentTags, newTag.trim()] });
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    const currentTags = entry.tags || [];
    onUpdate(entry.id, { tags: currentTags.filter(t => t !== tag) });
  };

  const getVisibilityBadge = () => {
      switch(entry.visibility) {
          case 'portfolio': return <Badge className="bg-green-600 border-none h-4 text-[8px] uppercase no-print">Review Mode Active</Badge>;
          case 'moderation': return <Badge className="bg-blue-600 border-none h-4 text-[8px] uppercase no-print">Moderation</Badge>;
          default: return <Badge variant="outline" className="h-4 text-[8px] uppercase text-muted-foreground no-print">Private</Badge>;
      }
  };

  return (
    <Card className={cn(
        "group transition-all hover:border-primary/30 print:border-slate-300 print:shadow-none print-avoid-break",
        entry.visibility === 'portfolio' && "border-green-200 bg-green-50/10 print:border-slate-300 print:bg-transparent"
    )}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0 print:p-3 print:pb-1">
        <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
                {getVisibilityBadge()}
                <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-slate-600">
                    {format(new Date(entry.created_at), 'dd MMM yyyy')}
                </span>
            </div>
            {isEditing ? (
                <Input 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    placeholder="Entry Title..."
                    className="h-8 text-sm font-bold no-print"
                />
            ) : (
                <CardTitle className="text-sm font-black truncate print:text-black print:whitespace-normal print:overflow-visible">
                    {entry.title || "Untitled Entry"}
                </CardTitle>
            )}
        </div>

        <div className="flex items-center gap-1 no-print">
            {!isLocked && !isEditing && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>Edit Entry</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleTogglePortfolio}>
                            {entry.visibility === 'portfolio' ? 'Remove from Review' : 'Include in Review'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(entry.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {isEditing && (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
                    <Button variant="default" size="icon" className="h-7 w-7" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                </div>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-4 print:p-3">
        {isEditing ? (
            <Textarea 
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Professional notes, observations, or reflections..."
                className="min-h-[100px] text-sm leading-relaxed bg-muted/20 no-print"
            />
        ) : (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap print:text-black">
                    {entry.content}
                </p>
                
                <EntryAttachmentManager entryId={entry.id} isLocked={isLocked || isEditing} />
            </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2">
            {(entry.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="h-5 gap-1 pl-1.5 pr-1 text-[10px] font-bold print:border-slate-300 print:bg-transparent print:text-slate-600">
                    <TagIcon className="h-2.5 w-2.5 opacity-40 no-print" />
                    {tag}
                    {!isLocked && (
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive no-print">
                            <X className="h-2.5 w-2.5" />
                        </button>
                    )}
                </Badge>
            ))}
            {!isLocked && (
                <div className="flex items-center gap-1 no-print">
                    <Input 
                        placeholder="Add tag..." 
                        className="h-5 w-20 text-[9px] px-1.5 border-dashed border-muted-foreground/30 focus-visible:ring-0" 
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTag()}
                    />
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};