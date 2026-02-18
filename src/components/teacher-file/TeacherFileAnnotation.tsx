"use client";

import React, { useState } from 'react';
import { useTeacherFileAnnotations } from '@/hooks/useTeacherFileAnnotations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, Check, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherFileAnnotationProps {
  yearId: string | undefined;
  termId?: string | null;
  sectionKey: string;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const TeacherFileAnnotation = ({ 
  yearId, 
  termId = null, 
  sectionKey, 
  label = "Professional Commentary",
  placeholder = "Add your reflections or administrative notes for this section...",
  className
}: TeacherFileAnnotationProps) => {
  const { content, setContent, saveAnnotation, isDraft } = useTeacherFileAnnotations(yearId, termId, sectionKey);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await saveAnnotation(content);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!isEditing && !content) {
    return (
      <div className={cn("no-print group", className)}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsEditing(true)}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary gap-2"
        >
          <MessageSquare className="h-3 w-3" />
          Add Annotation Overlay
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 relative group", className)}>
      <div className="flex items-center justify-between no-print">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
            <Edit3 className="h-3 w-3" /> {label}
        </h4>
        <div className="flex gap-2">
          {isEditing ? (
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="h-7 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] text-sm leading-relaxed border-blue-100 bg-blue-50/20 focus:bg-white transition-all no-print"
          autoFocus
        />
      ) : (
        <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/10 italic text-sm text-slate-700 leading-relaxed relative">
            <span className="absolute -left-1.5 top-4 w-1 h-8 bg-blue-600 rounded-full no-print" />
            {content}
            {isDraft && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-500 no-print" title="Unsaved draft" />}
        </div>
      )}
    </div>
  );
};