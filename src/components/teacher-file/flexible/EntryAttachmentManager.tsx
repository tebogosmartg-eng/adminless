"use client";

import React, { useRef, useState } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { TeacherFileEntryAttachment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { uploadEvidenceFile, deleteEvidenceFile, getSignedFileUrl } from '@/services/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    FileUp, 
    Trash2, 
    Download, 
    FileText, 
    Loader2, 
    Paperclip,
    ExternalLink
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface EntryAttachmentManagerProps {
  entryId: string;
  isLocked: boolean;
}

export const EntryAttachmentManager = ({ entryId, isLocked }: EntryAttachmentManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = useLiveQuery(
    () => db.teacherfile_entry_attachments.where('entry_id').equals(entryId).toArray(),
    [entryId]
  ) || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      const { path } = await uploadEvidenceFile(file, user.id);

      const newAttachment: TeacherFileEntryAttachment = {
        id: crypto.randomUUID(),
        entry_id: entryId,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        created_at: new Date().toISOString()
      };

      await db.teacherfile_entry_attachments.add(newAttachment);
      await queueAction('teacherfile_entry_attachments', 'create', newAttachment);
      showSuccess(`Attached "${file.name}"`);
    } catch (e: any) {
      showError("Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (item: TeacherFileEntryAttachment) => {
    try {
      await deleteEvidenceFile(item.file_path);
      await db.teacherfile_entry_attachments.delete(item.id);
      await queueAction('teacherfile_entry_attachments', 'delete', { id: item.id });
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
      showError("Failed to open file.");
    } finally {
      setLoadingFileId(null);
    }
  };

  return (
    <div className="space-y-3 pt-2 print-avoid-break">
      <div className="flex items-center justify-between">
        <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 print:text-slate-800">
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

      <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border bg-white/50 group/file hover:border-primary/20 transition-all print:border-slate-300 print:bg-transparent">
                  <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 no-print" />
                      <span className="text-[11px] font-medium truncate pr-2 text-slate-700 print:text-black">📎 {item.file_name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 no-print">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleView(item.file_path, item.id)} disabled={loadingFileId === item.id}>
                          {loadingFileId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                      {!isLocked && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/file:opacity-100" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-3 w-3" />
                          </Button>
                      )}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};