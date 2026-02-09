import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to Supabase storage 'evidence' bucket.
 * Returns the public URL.
 */
export const uploadEvidenceFile = async (file: File, userId: string): Promise<{ path: string; url: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
  
  // The path should be relative to the bucket root. 
  // We organize by userId folder for security.
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('evidence')
    .getPublicUrl(filePath);

  return { path: filePath, url: publicUrl };
};

/**
 * Deletes a file from Supabase storage.
 */
export const deleteEvidenceFile = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('evidence')
    .remove([filePath]);

  if (error) {
    throw error;
  }
};