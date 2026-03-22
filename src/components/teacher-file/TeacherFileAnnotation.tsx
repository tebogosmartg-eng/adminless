"use client";

import React from 'react';
import { useTeacherFileAnnotations } from '@/hooks/useTeacherFileAnnotations';
import { cn } from '@/lib/utils';
import { Loader2, Check, CloudUpload, MessageSquare, Lock } from 'lucide-react';

interface TeacherFileAnnotationProps {
  yearId: string | undefined;
  termId?: string | null;
  sectionKey: string;
  label?: string;
  placeholder?: string;
  className?: string;
  isLocked?: boolean;
}

export const TeacherFileAnnotation = ({ 
  yearId, 
  termId = null, 
  sectionKey, 
  label = "Professional Commentary",
  placeholder = "Click here to add your reflections or administrative notes for this section...",
  className,
  isLocked = false
}: TeacherFileAnnotationProps) => {
  const { content, updateContent, status } = useTeacherFileAnnotations(yearId, termId, sectionKey);

  const getStatusIcon = () => {
    if (isLocked) return null; // Hide status icons in document mode
    switch (status) {
      case 'saving': return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case 'saved': return <Check className="h-3 w-3 text-green-600" />;
      case 'queued': return <CloudUpload className="h-3 w-3 text-amber-600" />;
      default: return null;
    }
  };

  const getStatusText = () => {
    if (isLocked) return ""; // Hide status text in document mode
    switch (status) {
      case 'saving': return "Saving changes...";
      case 'saved': return "Saved to cloud";
      case 'queued': return "Offline (queued)";
      default: return "";
    }
  };

  return (
    <div className={cn("space-y-2 relative group print-avoid-break", className)}>
      <div className="flex items-center justify-between no-print">
        <h4 className={cn(
            "text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
            isLocked ? "text-slate-500" : "text-blue-600"
        )}>
            <MessageSquare className="h-3 w-3" /> {label}
        </h4>
        
        {!isLocked && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                  {getStatusText()}
              </span>
              {getStatusIcon()}
          </div>
        )}
      </div>

      {isLocked ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 italic border-l-2 border-slate-300 pl-4 py-2 min-h-[40px]">
            {content || "Section requirements have been reviewed. No additional qualitative commentary was required for this administrative period."}
        </div>
      ) : (
        <div className="relative">
          <textarea 
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder={placeholder}
            className={cn(
                "w-full min-h-[100px] text-sm leading-relaxed p-4 rounded-xl transition-all resize-none",
                "border-2 border-transparent outline-none",
                "bg-blue-50/10 hover:border-blue-100 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5",
                "print:hidden" 
            )}
            style={{ height: content ? 'auto' : '100px' }}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
            }}
          />
          
          <div className="hidden print:block whitespace-pre-wrap text-sm leading-relaxed text-slate-800 italic border-l-2 border-slate-300 pl-4 py-2 min-h-[40px]">
              {content || "Section requirements have been reviewed. No additional qualitative commentary was required for this administrative period."}
          </div>

          <div className={cn(
              "absolute -left-1.5 top-4 w-1 h-8 rounded-full no-print opacity-40 transition-opacity",
              "bg-blue-600 group-hover:opacity-100"
          )} />
        </div>
      )}

      {!isLocked && (
        <div className="no-print opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-slate-300 uppercase text-right tracking-widest">
            Autosave Enabled
        </div>
      )}
    </div>
  );
};