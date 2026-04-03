import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, Loader2, FileText, Camera, Image as ImageIcon } from 'lucide-react';
import { Evidence } from '@/lib/types';

interface UploadEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, category: Evidence['category'], notes: string, learnerId?: string) => Promise<void>;
  isUploading: boolean;
  learnerName?: string;
  learnerId?: string;
}

export const UploadEvidenceDialog = ({ open, onOpenChange, onUpload, isUploading, learnerName, learnerId }: UploadEvidenceDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Evidence['category']>('general');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload(file, category, notes, learnerId);
    setFile(null);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Attach Evidence</DialogTitle>
          <DialogDescription>
            {learnerName ? `Link evidence for ${learnerName}.` : 'Attach a document or photo to this class.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Source File</Label>
            <Input type="file" onChange={handleFileChange} className="h-10 cursor-pointer" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="script"><div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Scanned Script</div></SelectItem>
                <SelectItem value="moderation"><div className="flex items-center gap-2"><FileUp className="h-4 w-4" /> Moderation Note</div></SelectItem>
                <SelectItem value="photo"><div className="flex items-center gap-2"><Camera className="h-4 w-4" /> Evidence Photo</div></SelectItem>
                <SelectItem value="general">General Attachment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Context / Notes (Optional)</Label>
            <Textarea 
                placeholder="e.g. Moderated by Dept Head..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading} className="w-full sm:w-auto h-10 font-bold">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Upload & Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};