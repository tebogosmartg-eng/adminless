import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef } from 'react';
import { Learner } from '@/lib/types';
import { Upload, Camera } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Papa from "papaparse";
import { showSuccess, showError } from "@/utils/toast";

interface AddLearnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLearners: (learners: Learner[]) => void;
}

export const AddLearnerDialog = ({ open, onOpenChange, onAddLearners }: AddLearnerDialogProps) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { classId } = useParams();

  const handleAdd = () => {
    if (!text.trim()) return;

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const imported: Learner[] = lines.map(line => {
      // Basic CSV parsing: Name,Mark or just Name
      const parts = line.split(',');
      const name = parts[0].trim();
      let mark = "";
      
      if (parts.length > 1) {
        // If there's a comma, assume second part is mark
        const possibleMark = parts[1].trim();
        // Simple check if it looks like a number
        if (/^[\d./]+$/.test(possibleMark)) {
            mark = possibleMark;
        }
      }
      
      return { name, mark };
    });

    if (imported.length > 0) {
      onAddLearners(imported);
      setText('');
      onOpenChange(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          let importedLearners: Learner[] = [];
          const data = results.data as any[];

          // Check for headers
          const hasHeader = results.meta.fields && (results.meta.fields.includes("Name") || results.meta.fields.includes("Learner Name"));
          
          if (hasHeader) {
             const nameField = results.meta.fields?.includes("Name") ? "Name" : "Learner Name";
             const markField = results.meta.fields?.find(f => f.toLowerCase().includes("mark") || f.toLowerCase().includes("score"));
             
             importedLearners = data.map(row => ({
                name: row[nameField!] || "",
                mark: markField ? (row[markField] || "") : ""
             })).filter(l => l.name);
          } else {
             // No header? Assume Col 1 = Name, Col 2 = Mark (optional)
             importedLearners = data.map(row => {
                const values = Array.isArray(row) ? row : Object.values(row);
                return {
                    name: values[0] as string,
                    mark: (values[1] as string) || ""
                };
             }).filter(l => l.name && typeof l.name === 'string');
          }

          if (importedLearners.length > 0) {
             const formattedText = importedLearners.map(l => l.mark ? `${l.name}, ${l.mark}` : l.name).join("\n");
             const current = text ? text + "\n" : "";
             setText(current + formattedText);
             showSuccess(`Loaded ${importedLearners.length} learners from CSV. Click Add to confirm.`);
          } else {
             showError("Could not find valid data in CSV.");
          }
          
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        header: true,
        skipEmptyLines: true
      });
    }
  };

  const handleScanNavigate = () => {
    onOpenChange(false);
    navigate("/scan", { state: { classId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Add Learners</DialogTitle>
          <DialogDescription>
            Add multiple learners at once. Paste a list (Name, Mark) or upload a CSV.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea 
            placeholder="John Doe&#10;Jane Smith, 85&#10;Peter Pan, 92" 
            className="min-h-[200px] font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
             <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleScanNavigate}>
                    <Camera className="mr-2 h-4 w-4" /> Scan Image
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Upload CSV
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleFileUpload}
                />
             </div>
             
             <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!text.trim()}>Add Learners</Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};