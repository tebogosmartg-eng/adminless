"use client";

import React, { useRef, useState } from 'react';
import { useTeacherFileAttachments } from '@/hooks/useTeacherFileAttachments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUp, Trash2, ExternalLink, FileText, Loader2, Paperclip, Download } from 'lucide-react';
import { getSignedFileUrl } from '@/services/storage';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { db, TeacherFileAttachment } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/services/storage';
import { showSuccess } from '@/utils/toast';
import { useLiveQuery } from 'dexie-react-hooks';

interface TeacherFileAttachmentManagerProps {
  yearId: string | undefined;
  termId: string | undefined;
  sectionKey: string;
  isLocked?: boolean;
  assessmentId?: string | null;
}

export const TeacherFileAttachmentManager = ({ yearId, termId, sectionKey, isLocked, assessmentId = null }: TeacherFileAttachmentManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const attachments = useLiveQuery(
    () => (yearId && termId && sectionKey) 
      ? db.teacher_file_attachments
          .where('[academic_year_id+term_id+section_key]')
          .equals([yearId, termId, sectionKey])
          .filter(a => assessmentId ? a.assessment_id === assessmentId : true)
          .toArray()
      : [],
    [yearId, termId, sectionKey, assessmentId]
  ) || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !yearId || !termId) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      const { path } = await uploadEvidenceFile(file, user.id);

      const newAttachment: TeacherFileAttachment = {
        id: crypto.randomUUID(),
        user_id: user.id,
        academic_year_id: yearId,
        term_id: termId,
        section_key: sectionKey,
        assessment_id: assessmentId,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        created_at: new Date().toISOString()
      };

      await db.teacher_file_attachments.add(newAttachment);
      await queueAction('teacher_file_attachments', 'create', newAttachment);
      showSuccess(`Attached "${file.name}" to section.`);
    } catch (e: any) {
      showError("Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (item: TeacherFileAttachment) => {
    try {
      await deleteEvidenceFile(item.file_path);
      await db.teacher_file_attachments.delete(item.id);
      await queueAction('teacher_file_attachments', 'delete', { id: item.id });
      showSuccess("Attachment removed.");
    } catch (e) {
      showError("Failed to delete.");
    }
  };

  const handleView = async (path: string, id: string) => {
    setLoadingFileId(id);
    try {
      const url = await getSignedFileUrl(path);
      window.open(url, '_blank', 'noreferrer');
    } catch (e) {
      showError("Failed to generate preview.");
    } finally {
      setLoadingFileId(null);
    }
  };

  return (
    <div className="space-y-4 print-avoid-break">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 print:text-black">
            <Paperclip className="h-3 w-3 no-print" /> Section Documents ({attachments.length})
        </h4>
        {!isLocked && (
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-black uppercase tracking-tighter no-print"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileUp className="h-3 w-3 mr-1" />}
                Upload to Section
            </Button>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="grid gap-2">
          {attachments.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-background group hover:border-primary/30 transition-all print:border-slate-300">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/5 transition-colors print:bg-transparent print:border print:border-slate-200">
                          <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary print:text-slate-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold truncate pr-4 print:text-black">{item.file_name}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-medium print:text-slate-500">
                              Added {new Date(item.created_at).toLocaleDateString()}
                          </span>
                      </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 no-print">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(item.file_path, item.id)} disabled={loadingFileId === item.id}>
                          {loadingFileId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                      {!isLocked && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      )}
                  </div>
              </div>
          ))}
          {attachments.length === 0 && (
              <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/5 print:border-none print:bg-transparent print:py-2 print:text-left print:p-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-30 print:opacity-100 print:normal-case print:italic print:text-slate-800">No supplementary documents attached</p>
              </div>
          )}
      </div>
    </div>
  );
};