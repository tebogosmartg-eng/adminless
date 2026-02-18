"use client";

import React, { useRef, useState } from 'react';
import { useTeacherFileAttachments } from '@/hooks/useTeacherFileAttachments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUp, Trash2, ExternalLink, FileText, Loader2, Paperclip, Download } from 'lucide-react';
import { getSignedFileUrl } from '@/services/storage';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface TeacherFileAttachmentManagerProps {
  yearId: string | undefined;
  termId: string | undefined;
  sectionKey: string;
  isLocked?: boolean;
}

export const TeacherFileAttachmentManager = ({ yearId, termId, sectionKey, isLocked }: TeacherFileAttachmentManagerProps) => {
  const { attachments, uploadAttachment, deleteAttachment, isUploading } = useTeacherFileAttachments(yearId, termId, sectionKey);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadAttachment(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Paperclip className="h-3 w-3" /> Section Attachments ({attachments.length})
        </h4>
        {!isLocked && (
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-black uppercase tracking-tighter"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileUp className="h-3 w-3 mr-1" />}
                Upload Document
            </Button>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="grid gap-2">
          {attachments.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-background group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/5 transition-colors">
                          <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold truncate pr-4">{item.file_name}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              Added {new Date(item.created_at).toLocaleDateString()}
                          </span>
                      </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(item.file_path, item.id)} disabled={loadingFileId === item.id}>
                          {loadingFileId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                      {!isLocked && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteAttachment(item)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      )}
                  </div>
              </div>
          ))}
          {attachments.length === 0 && (
              <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">No documents attached</p>
              </div>
          )}
      </div>
    </div>
  );
};