"use client";

import React, { useState } from 'react';
import { useTeacherFileFlexible } from '@/hooks/useTeacherFileFlexible';
import { SectionEditor } from './SectionEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    PlusCircle, 
    Settings, 
    Save, 
    Eye, 
    Sparkles, 
    Loader2, 
    LayoutGrid, 
    Rocket,
    CheckCircle2,
    ShieldCheck,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionType } from '@/lib/types';
import { Link } from 'react-router-dom';

interface TeacherFileFlexibleEditorProps {
  classId: string;
  termId: string;
  isLocked?: boolean;
}

export const TeacherFileFlexibleEditor = ({ classId, termId, isLocked = false }: TeacherFileFlexibleEditorProps) => {
  const { 
    template, 
    sections, 
    entries, 
    initDefaultTemplate, 
    addSection, 
    updateSection, 
    deleteSection,
    addEntry,
    updateEntry,
    deleteEntry
  } = useTeacherFileFlexible(classId, termId);

  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState<SectionType>("notes");

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <div className="p-8 bg-blue-100 rounded-full text-blue-600">
              <Rocket className="h-12 w-12" />
          </div>
          <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-black text-slate-900">Unlock Flexible Portfolio</h3>
              <p className="text-sm text-muted-foreground font-medium">Create custom sections to track weekly notes, interventions, and student support for this specific class.</p>
          </div>
          <Button size="lg" onClick={initDefaultTemplate} className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-blue-500/20 gap-3">
              <Sparkles className="h-5 w-5" /> Initialize Term Workspace
          </Button>
      </div>
    );
  }

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    await addSection(newSectionTitle, newSectionType);
    setNewSectionTitle("");
    setIsAddingSection(false);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Portfolio Designer
            </h2>
            <p className="text-xs text-muted-foreground font-medium">Manage custom sections and professional entries for this class.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none h-10 px-6 rounded-xl font-bold border-green-200 text-green-700 hover:bg-green-50">
                <Link to={`/year/${template.user_id}/term/${termId}/class/${classId}/teacher-file/review`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Enter Review Mode
                </Link>
            </Button>
            {!isLocked && (
                <Button size="sm" onClick={() => setIsAddingSection(true)} className="flex-1 sm:flex-none h-10 px-6 rounded-xl font-black shadow-lg gap-2">
                    <PlusCircle className="h-4 w-4" /> New Section
                </Button>
            )}
        </div>
      </div>

      <div className="grid gap-12">
        {sections.map((section) => (
            <SectionEditor 
                key={section.id}
                section={section}
                entries={entries.filter(e => e.section_id === section.id)}
                isLocked={isLocked}
                onUpdateSection={updateSection}
                onDeleteSection={deleteSection}
                onAddEntry={addEntry}
                onUpdateEntry={updateEntry}
                onDeleteEntry={deleteEntry}
            />
        ))}

        {sections.length === 0 && (
            <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
                No sections defined. Click "New Section" to start building your portfolio.
            </div>
        )}

        {isAddingSection && (
            <Card className="border-primary/50 shadow-2xl bg-primary/[0.03] animate-in zoom-in duration-300">
                <CardHeader>
                    <CardTitle className="text-lg">Design New Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest">Section Title</label>
                            <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="e.g. Behavioral Logs" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest">Section Type</label>
                            <select 
                                value={newSectionType} 
                                onChange={e => setNewSectionType(e.target.value as SectionType)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="notes">Notes & Narratives</option>
                                <option value="observations">Observation Logs</option>
                                <option value="interventions">Intervention Proof</option>
                                <option value="targets">Term Targets</option>
                                <option value="attachments">Evidence Folder</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setIsAddingSection(false)}>Cancel</Button>
                        <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()}>Create Section</Button>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>

      {isLocked && (
          <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-100 flex items-center gap-4 text-amber-800">
              <ShieldCheck className="h-8 w-8 opacity-20 shrink-0" />
              <div className="space-y-1">
                  <h4 className="font-black text-sm uppercase tracking-tight">Authenticated Record Locked</h4>
                  <p className="text-xs opacity-80 leading-relaxed">This Teacher File chapter belongs to a finalised academic period. Edits are disabled to preserve the audit trail, but you can still access Review Mode for moderation purposes.</p>
              </div>
          </div>
      )}
    </div>
  );
};