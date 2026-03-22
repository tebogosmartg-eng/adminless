import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef } from 'react';
import { Learner } from '@/lib/types';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Papa from "papaparse";
import { showSuccess, showError } from "@/utils/toast";
import { scanRosterWithGemini } from "@/services/gemini";
import { compressImage } from "@/utils/image";

interface AddLearnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLearners: (learners: Learner[]) => void;
}

export const AddLearnerDialog = ({ open, onOpenChange, onAddLearners }: AddLearnerDialogProps) => {
  const [text, setText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsScanning(true);
    showSuccess("Analyzing register... This may take a few seconds.");
    
    try {
        const compressedImages = await Promise.all(
            Array.from(files).map(file => compressImage(file))
        );
        
        const result = await scanRosterWithGemini(compressedImages);
        
        if (result && result.learners && result.learners.length > 0) {
            const names = result.learners.map((l: any) => {
                if (typeof l === 'string') return l;
                return `${l.name} ${l.surname || ''}`.trim();
            }).filter((n: string) => n.length > 0);
            
            if (names.length > 0) {
                const current = text ? text.trim() + "\n" : "";
                setText(current + names.join("\n"));
                showSuccess(`Extracted ${names.length} names from image. Please review them.`);
            } else {
                showError("No valid names found in the extracted data.");
            }
        } else {
            showError("No names detected in the image.");
        }
    } catch (err: any) {
        console.error(err);
        showError(err.message || "Failed to scan register.");
    } finally {
        setIsScanning(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Add Learners</DialogTitle>
          <DialogDescription>
            Add multiple learners at once. Paste a list, scan a register, or upload a CSV.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => imageInputRef.current?.click()} disabled={isScanning} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                  {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />} 
                  {isScanning ? "Scanning..." : "Scan Paper Register"}
              </Button>
              <Button variant="secondary" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex-1">
                  <Upload className="mr-2 h-4 w-4" /> Upload CSV List
              </Button>
          </div>
          
          <div className="relative">
              {isScanning && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-md border">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                      <span className="text-xs font-bold text-muted-foreground">Extracting Names...</span>
                  </div>
              )}
              <Textarea 
                placeholder="Or type/paste list here...&#10;John Doe&#10;Jane Smith, 85&#10;Peter Pan, 92" 
                className="min-h-[200px] font-mono text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isScanning}
              />
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
             <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
             <Button onClick={handleAdd} disabled={!text.trim() || isScanning}>Add Learners</Button>
          </div>
          
          <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileUpload}
          />
          <input 
              type="file" 
              ref={imageInputRef} 
              className="hidden" 
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};