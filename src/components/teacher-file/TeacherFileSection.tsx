"use client";

import React from 'react';
import { TeacherFileAnnotation } from './TeacherFileAnnotation';
import { TeacherFileAttachmentManager } from './TeacherFileAttachmentManager';
import { cn } from '@/lib/utils';

interface TeacherFileSectionProps {
  yearId: string | undefined;
  termId: string | undefined;
  sectionKey: string;
  title: string;
  description?: string;
  isLocked?: boolean;
  children?: React.ReactNode;
  hideCommentary?: boolean;
  hideAttachments?: boolean;
  assessmentId?: string | null;
}

export const TeacherFileSection = ({
  yearId,
  termId,
  sectionKey,
  title,
  description,
  isLocked,
  children,
  hideCommentary = false,
  hideAttachments = false,
  assessmentId = null
}: TeacherFileSectionProps) => {
  return (
    <div className="space-y-6 pb-10 border-b border-slate-100 last:border-0">
      <div className="space-y-1">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        {description && <p className="text-xs text-muted-foreground font-medium">{description}</p>}
      </div>

      {children && (
          <div className="p-6 rounded-2xl border bg-slate-50/50">
              {children}
          </div>
      )}

      {!hideCommentary && (
        <TeacherFileAnnotation 
          yearId={yearId}
          termId={termId}
          sectionKey={`${sectionKey}.commentary`}
          isLocked={isLocked}
          label="Professional Notes & Commentary"
          placeholder={`Enter your reflections or administrative notes for ${title.toLowerCase()}...`}
        />
      )}

      {!hideAttachments && (
        <TeacherFileAttachmentManager 
          yearId={yearId}
          termId={termId}
          sectionKey={sectionKey}
          isLocked={isLocked}
          assessmentId={assessmentId}
        />
      )}
    </div>
  );
};