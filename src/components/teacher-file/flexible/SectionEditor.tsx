"use client";

import React, { useState } from 'react';
import { TeacherFileTemplateSection, TeacherFileEntry, SectionType } from '@/lib/types';
import { EntryCard } from './EntryCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Plus, 
    GripVertical, 
    Settings2, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    FileText,
    Target,
    Users,
    ClipboardList,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionEditorProps {
  section: TeacherFileTemplateSection;
  entries: TeacherFileEntry[];
  isLocked: boolean;
  onUpdateSection: (id: string, updates: Partial<TeacherFileTemplateSection>) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onAddEntry: (sectionId: string, title: string, content: string) => Promise<void>;
  onUpdateEntry: (id: string, updates: Partial<TeacherFileEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export const SectionEditor = ({
  section,
  entries,
  isLocked,
  onUpdateSection,
  onDeleteSection,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry
}: SectionEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryContent, setNewEntryContent] = useState("");

  const handleAdd = async () => {
    if (!newEntryContent.trim()) return;
    await onAddEntry(section.id, newEntryTitle, newEntryContent);
    setNewEntryTitle("");
    setNewEntryContent("");
    setIsAdding(false);
  };

  const getSectionIcon = () => {
      switch(section.type) {
          case 'targets': return <Target className="h-5 w-5" />;
          case 'interventions': return <Users className="h-5 w-5" />;
          case 'checklist': return <ClipboardList className="h-5 w-5" />;
          default: return <FileText className="h-5 w-5" />;
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-4 flex-1">
            {!isLocked && <GripVertical className="h-4 w-4 text-slate-300 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className={cn(
                "p-2.5 rounded-xl border-2 transition-colors",
                isExpanded ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-transparent"
            )}>
                {getSectionIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <Input 
                    value={section.title}
                    onChange={e => !isLocked && onUpdateSection(section.id, { title: e.target.value })}
                    disabled={isLocked}
                    className="h-7 text-lg font-black border-none shadow-none bg-transparent p-0 focus-visible:ring-0 w-full"
                />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{section.type}</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {!isLocked && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => onDeleteSection(section.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
        </div>
      </div>

      {isExpanded && (
          <div className="pl-14 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid gap-3">
                  {entries.map(entry => (
                      <EntryCard 
                        key={entry.id} 
                        entry={entry} 
                        isLocked={isLocked} 
                        onUpdate={onUpdateEntry} 
                        onDelete={onDeleteEntry} 
                      />
                  ))}
              </div>

              {isAdding ? (
                  <Card className="border-primary/40 shadow-xl bg-primary/[0.02]">
                      <CardContent className="p-4 space-y-4">
                          <Input 
                            placeholder="Entry Title (Optional)" 
                            value={newEntryTitle} 
                            onChange={e => setNewEntryTitle(e.target.value)} 
                            className="h-8 text-sm font-bold"
                          />
                          <textarea 
                            placeholder="Professional commentary..."
                            value={newEntryContent}
                            onChange={e => setNewEntryContent(e.target.value)}
                            className="w-full min-h-[100px] text-sm p-4 rounded-xl border bg-white focus:ring-2 focus:ring-primary outline-none resize-none"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                              <Button size="sm" onClick={handleAdd} disabled={!newEntryContent.trim()}>
                                  Create Entry
                              </Button>
                          </div>
                      </CardContent>
                  </Card>
              ) : (
                  !isLocked && (
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAdding(true)} 
                        className="w-full h-10 border-dashed hover:border-primary/40 hover:bg-primary/5 gap-2 group"
                      >
                          <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Add New Entry to {section.title}</span>
                      </Button>
                  )
              )}
          </div>
      )}
    </div>
  );
};