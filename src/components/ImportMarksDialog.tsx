import { useState } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassInfo, Learner } from './CreateClassDialog';
import { showError, showSuccess } from '@/utils/toast';

interface ImportMarksDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  classInfo: ClassInfo;
  onImportComplete: (updatedLearners: Learner[]) => void;
}

export const ImportMarksDialog = ({ isOpen, onOpenChange, classInfo, onImportComplete }: ImportMarksDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      showError("Please select a file to import.");
      return;
    }

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedData = results.data as { "Learner Name": string; "Mark": string }[];
        let updatedCount = 0;

        const updatedLearners = classInfo.learners.map(learner => {
          const match = importedData.find(row => 
            row["Learner Name"]?.trim().toLowerCase() === learner.name.trim().toLowerCase()
          );

          if (match && match.Mark) {
            updatedCount++;
            return { ...learner, mark: match.Mark.trim() };
          }
          return learner;
        });

        onImportComplete(updatedLearners);
        showSuccess(`Import complete. Updated marks for ${updatedCount} learner(s).`);
        setIsImporting(false);
        onOpenChange(false);
        setFile(null);
      },
      error: (error) => {
        showError(`Failed to parse CSV file: ${error.message}`);
        setIsImporting(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Marks from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with "Learner Name" and "Mark" columns. The names will be matched against your class list.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? "Importing..." : "Import Marks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};