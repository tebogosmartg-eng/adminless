"use client";

import React, { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import {
  FileUp,
  Trash2,
  Download,
  FileText,
  Loader2,
  Paperclip
} from "lucide-react";

import { getSignedFileUrl } from "@/services/storage";
import { showSuccess, showError } from "@/utils/toast";

interface EntryAttachmentManagerProps {
  entryId: string;
  isLocked: boolean;
}

export const EntryAttachmentManager = ({
  entryId,
  isLocked
}: EntryAttachmentManagerProps) => {

  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 FETCH ATTACHMENTS
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!entryId) return;

      const { data, error } = await supabase
        .from("teacherfile_entry_attachments")
        .select("*")
        .eq("entry_id", entryId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showError("Failed to load attachments");
        return;
      }

      setAttachments(data || []);
    };

    fetchAttachments();
  }, [entryId]);

  // 🔥 UPLOAD
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      // upload file
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // insert DB record
      const payload = {
        entry_id: entryId,
        file_path: filePath,
        file_name: file.name,
        mime_type: file.type
      };

      const { data, error } = await supabase
        .from("teacherfile_entry_attachments")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setAttachments(prev => [data, ...prev]);

      showSuccess(`Attached "${file.name}"`);
    } catch (e) {
      console.error(e);
      showError("Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 🔥 DELETE
  const handleDelete = async (item: any) => {
    try {
      // remove from storage
      await supabase.storage
        .from("evidence")
        .remove([item.file_path]);

      // remove from DB
      const { error } = await supabase
        .from("teacherfile_entry_attachments")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== item.id));

      showSuccess("Attachment removed.");
    } catch (e) {
      console.error(e);
      showError("Failed to delete.");
    }
  };

  // 🔥 VIEW
  const handleView = async (path: string, id: string) => {
    setLoadingFileId(id);

    try {
      const url = await getSignedFileUrl(path);
      window.open(url, "_blank", "noreferrer");
    } catch (e) {
      showError("Failed to open file.");
    } finally {
      setLoadingFileId(null);
    }
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
            {isUploading ? (
              <Loader2 className="animate-spin mr-1" />
            ) : (
              <FileUp className="mr-1" />
            )}
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

      <div className="grid gap-2 sm:grid-cols-2">

        {attachments.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-sm truncate">
                {item.file_name}
              </span>
            </div>

            <div className="flex gap-1">

              <Button
                size="icon"
                onClick={() => handleView(item.file_path, item.id)}
              >
                {loadingFileId === item.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
              </Button>

              {!isLocked && (
                <Button
                  size="icon"
                  onClick={() => handleDelete(item)}
                >
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