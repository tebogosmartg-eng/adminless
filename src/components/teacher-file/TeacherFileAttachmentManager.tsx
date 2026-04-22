"use client";

import React, { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  FileUp,
  Trash2,
  FileText,
  Loader2,
  Paperclip,
  Download
} from "lucide-react";

interface TeacherFileAttachmentManagerProps {
  yearId: string | undefined;
  termId: string | undefined;
  sectionKey: string;
  isLocked?: boolean;
  assessmentId?: string | null;
}

export const TeacherFileAttachmentManager = ({
  yearId,
  termId,
  sectionKey,
  isLocked,
  assessmentId = null
}: TeacherFileAttachmentManagerProps) => {

  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = false;
  void loading;
  void yearId;
  void termId;
  void sectionKey;
  void assessmentId;
  void setAttachments;

  // 🔥 UPLOAD
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    void e;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🔥 DELETE
  const handleDelete = async (item: any) => {
    void item;
  };

  // 🔥 VIEW
  const handleView = async (path: string, id: string) => {
    void path;
    void id;
    setLoadingFileId(null);
  };

  return (
    <div className="space-y-3 pt-2">

      <div className="flex items-center justify-between">
        <h5 className="text-[9px] font-black uppercase flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" />
          Linked Evidence ({attachments.length})
        </h5>

        {!isLocked && (
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin mr-1" /> : <FileUp className="mr-1" />}
            Add File
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="grid gap-2">

        {attachments.map(item => (
          <div key={item.id} className="flex justify-between p-2 border rounded">

            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-sm truncate">{item.file_name}</span>
            </div>

            <div className="flex gap-1">
              <Button size="icon" onClick={() => handleView(item.file_path, item.id)}>
                {loadingFileId === item.id ? <Loader2 className="animate-spin" /> : <Download />}
              </Button>

              {!isLocked && (
                <Button size="icon" onClick={() => handleDelete(item)}>
                  <Trash2 />
                </Button>
              )}
            </div>

          </div>
        ))}

        {attachments.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6">
            No attachments yet
          </div>
        )}

      </div>
    </div>
  );
};