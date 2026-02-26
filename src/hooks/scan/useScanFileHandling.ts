import { useState } from 'react';
import { compressImage } from '@/utils/image';
import { showSuccess, showError } from '@/utils/toast';

export const useScanFileHandling = () => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        setOriginalFile(files[0]);
        const compressedImages = await Promise.all(
            Array.from(files).map(file => compressImage(file))
        );
        setImagePreviews(compressedImages);
        showSuccess(`Loaded ${files.length} images for scanning.`);
        return true;
      } catch (e) {
        showError("Failed to load or compress images.");
        return false;
      }
    }
    return false;
  };

  const clearImages = () => {
      setImagePreviews([]);
      setOriginalFile(null);
  };

  return {
    imagePreviews, setImagePreviews,
    originalFile, setOriginalFile,
    handleFileChange,
    clearImages
  };
};