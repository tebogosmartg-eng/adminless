import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Save } from 'lucide-react';
import { useClasses } from '../context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';

const mockScanResults: Learner[] = [
  { name: "Alice Johnson", mark: "88" },
  { name: "Bob Williams", mark: "72" },
  { name: "Charlie Brown", mark: "95" },
];

const Scan = () => {
  const { classes, updateLearners } = useClasses();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedLearners, setScannedLearners] = useState<Learner[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setScannedLearners([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = () => {
    if (!imagePreview) {
      showError("Please upload an image first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      // In a real app, you'd get these results from an OCR API
      setScannedLearners(mockScanResults);
      setIsProcessing(false);
      showSuccess("Image processed successfully!");
    }, 1500);
  };

  const handleScannedMarkChange = (index: number, newMark: string) => {
    const updatedScannedLearners = [...scannedLearners];
    updatedScannedLearners[index].mark = newMark;
    setScannedLearners(updatedScannedLearners);
  };

  const handleSaveChanges = () => {
    if (!selectedClassId) {
      showError("Please select a class to save the marks.");
      return;
    }
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) {
      showError("Selected class not found.");
      return;
    }

    let matchedCount = 0;
    const updatedLearners = targetClass.learners.map(learner => {
      const scannedMatch = scannedLearners.find(sl => sl.name.toLowerCase() === learner.name.toLowerCase());
      if (scannedMatch) {
        matchedCount++;
        return { ...learner, mark: scannedMatch.mark };
      }
      return learner;
    });

    updateLearners(selectedClassId, updatedLearners);
    showSuccess(`Marks saved to ${targetClass.className}. ${matchedCount} learner(s) updated.`);
    
    // Reset state for next scan
    setImagePreview(null);
    setScannedLearners([]);
    setSelectedClassId(undefined);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Scan Scripts</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Script</CardTitle>
            <CardDescription>Choose an image of the script to scan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg">
              {imagePreview ? (
                <img src={imagePreview} alt="Script preview" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Drag & drop or click to upload</p>
                </div>
              )}
            </div>
            <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-4" />
            <Button onClick={handleProcessImage} disabled={isProcessing || !imagePreview} className="w-full mt-4">
              {isProcessing ? "Processing..." : <><FileText className="mr-2 h-4 w-4" /> Process Image</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Review & Save</CardTitle>
            <CardDescription>Verify the scanned marks and save them to a class.</CardDescription>
          </CardHeader>
          <CardContent>
            {scannedLearners.length > 0 ? (
              <>
                <div className="mb-4">
                  <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class to save marks" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.subject} - {c.className}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learner Name</TableHead>
                        <TableHead className="text-right">Mark (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scannedLearners.map((learner, index) => (
                        <TableRow key={index}>
                          <TableCell>{learner.name}</TableCell>
                          <TableCell className="text-right">
                             <Input
                              type="number"
                              value={learner.mark}
                              onChange={(e) => handleScannedMarkChange(index, e.target.value)}
                              className="w-24 text-right ml-auto"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleSaveChanges} disabled={!selectedClassId} className="w-full mt-4">
                  <Save className="mr-2 h-4 w-4" /> Save to Class
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <p>Processing results will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Scan;