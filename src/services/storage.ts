import { supabase } from "@/lib/supabaseClient";

/**
 * Uploads a file to Supabase storage 'evidence' bucket.
 * Returns the path.
 */
export const uploadEvidenceFile = async (file: File, userId: string): Promise<{ path: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
  
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  return { path: filePath };
};

/**
 * Generates a temporary signed URL for viewing a private file.
 * Defaults to 1 hour (3600 seconds) expiration.
 */
export const getSignedFileUrl = async (filePath: string, expiresIn = 3600): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
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