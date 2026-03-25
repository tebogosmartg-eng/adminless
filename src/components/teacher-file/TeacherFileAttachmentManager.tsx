"use client";

import React, { useRef, useState } from 'react';
import { useTeacherFileAttachments } from '@/hooks/useTeacherFileAttachments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUp, Trash2, ExternalLink, FileText, Loader2, Paperclip, Download } from 'lucide-react';
import { getSignedFileUrl } from '@/services/storage';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { db } from '@/db';
import { TeacherFileAttachment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/services/storage';
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
          .filter((a: any) => assessmentId ? a.assessment_id === assessmentId : true)
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
    <div className="space-y-3 pt-2 print-avoid-break">
      <div className="flex items-center justify-between">
        <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 print:text-slate-800">
            <Paperclip className="h-3 w-3 no-print" /> Linked Evidence ({attachments.length})
        </h5>
        {!isLocked && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[8px] font-black uppercase hover:bg-primary/5 hover:text-primary no-print"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <FileUp className="h-2.5 w-2.5 mr-1" />}
                Add File
            </Button>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      <div className={cn("grid gap-2", isLocked ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
          {attachments.map((item: any) => (
              <div key={item.id} className={cn("flex items-center justify-between p-2 rounded-lg transition-all group/file", isLocked ? "bg-transparent py-1 px-0" : "border bg-white/50 hover:border-primary/20", "print:border-none print:bg-transparent print:p-0")}>
                  <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 no-print" />
                      <span className="text-[11px] font-medium truncate pr-2 text-slate-800 print:text-black">
                          {isLocked && <span className="mr-2 text-slate-300">•</span>}
                          {item.file_name}
                      </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 no-print">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleView(item.file_path, item.id)} disabled={loadingFileId === item.id}>
                          {loadingFileId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 text-slate-400 hover:text-slate-900" />}
                      </Button>
                      {!isLocked && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/file:opacity-100" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-3 w-3" />
                          </Button>
                      )}
                  </div>
              </div>
          ))}
          {attachments.length === 0 && (
              <div className={cn("text-slate-500", isLocked ? "text-xs italic py-1" : "py-8 text-center border-2 border-dashed rounded-xl bg-muted/5", "print:border-none print:bg-transparent print:py-2 print:text-left print:p-0")}>
                  <p className={cn("font-medium", !isLocked && "text-[10px] uppercase font-bold tracking-widest opacity-50 no-print")}>
                      {isLocked ? "Supporting documentation is maintained in physical files or external departmental archives." : "Supplementary documents may be managed externally"}
                  </p>
                  {!isLocked && <p className="hidden print:block text-sm italic text-slate-600 mt-2">Supporting documentation is maintained in physical files or external departmental archives as per standard compliance procedures.</p>}
              </div>
          )}
      </div>
    </div>
  );
};