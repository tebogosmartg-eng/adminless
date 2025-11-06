import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Save, AlertCircle } from 'lucide-react';
import { useClasses } from '../context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showSuccess, showError } from '@/utils/toast';

interface ScannedLearner {
  name: string;
  mark: string; // e.g., "42/50"
}

interface ScannedDetails {
  subject: string;
  testNumber: string;
  grade: string;
  date: string;
}

interface MockScanResult {
  details: ScannedDetails;
  learners: ScannedLearner[];
}

const mockScanResultsSets: MockScanResult[] = [
  {
    details: { subject: "Mathematics", testNumber: "Test 1", grade: "Grade 10", date: "2024-07-21" },
    learners: [
      { name: "Alice Johnson", mark: "88/100" },
      { name: "Bob Williams", mark: "72/100" },
      { name: "Charlie Brown", mark: "95/100" },
    ],
  },
  {
    details: { subject: "Physical Science", testNumber: "Experiment 3", grade: "Grade 11", date: "2024-07-20" },
    learners: [
      { name: "David Smith", mark: "35/50" },
      { name: "Emily Jones", mark: "48/50" },
      { name: "Frank Miller", mark: "29/50" },
    ],
  },
  {
    details: { subject: "History", testNumber: "Essay 2", grade: "Grade 9", date: "2024-07-19" },
    learners: [
      { name: "Grace Davis", mark: "65/75" },
      { name: "Henry Wilson", mark: "71/75" },
      { name: "Ivy Moore", mark: "55/75" },
    ],
  },
];

const Scan = () => {
  const { classes, updateLearners } = useClasses();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPreviews: Promise<string>[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        newPreviews.push(new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }));
      });
      
      Promise.all(newPreviews).then((previews) => {
        setImagePreviews(previews);
        setScannedLearners([]);
        setScannedDetails(null);
      });
    }
  };

  const handleProcessImage = () => {
    if (imagePreviews.length === 0) {
      showError("Please upload one or more images first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      // Cycle through mock data based on number of images to simulate different results
      const resultSet = mockScanResultsSets[imagePreviews.length % mockScanResultsSets.length];
      setScannedDetails(resultSet.details);
      setScannedLearners(resultSet.learners);
      setIsProcessing(false);
      showSuccess(`Processed ${imagePreviews.length} image(s) successfully!`);
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
        try {
          const parts = scannedMatch.mark.split('/');
          if (parts.length !== 2) throw new Error("Invalid format");
          
          const obtained = parseFloat(parts[0]);
          const total = parseFloat(parts[1]);

          if (isNaN(obtained) || isNaN(total) || total === 0) throw new Error("Invalid numbers");

          const percentage = ((obtained / total) * 100).toFixed(1);
          matchedCount++;
          return { ...learner, mark: percentage };

        } catch (e) {
          console.error(`Could not parse mark "${scannedMatch.mark}" for ${learner.name}. Skipping.`);
          return learner; // Return original learner if parsing fails
        }
      }
      return learner;
    });

    updateLearners(selectedClassId, updatedLearners);
    showSuccess(`Marks saved to ${targetClass.className}. ${matchedCount} learner(s) updated.`);
    
    // Reset state
    setImagePreviews([]);
    setScannedLearners([]);
    setScannedDetails(null);
    setSelectedClassId(undefined);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Scan Scripts</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Scripts</CardTitle>
            <CardDescription>Choose one or more images of scripts to scan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center w-full min-h-64 p-2 border-2 border-dashed rounded-lg">
              {imagePreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, index) => (
                    <img key={index} src={src} alt={`Script preview ${index + 1}`} className="max-h-full max-w-full object-contain rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Drag & drop or click to upload</p>
                </div>
              )}
            </div>
            <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-4" multiple />
            <Button onClick={handleProcessImage} disabled={isProcessing || imagePreviews.length === 0} className="w-full mt-4">
              {isProcessing ? "Processing..." : <><FileText className="mr-2 h-4 w-4" /> Process Images</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Review & Save</CardTitle>
            <CardDescription>Verify the scanned data and save marks to a class.</CardDescription>
          </CardHeader>
          <CardContent>
            {scannedDetails && scannedLearners.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div><Label>Subject</Label><Input value={scannedDetails.subject} readOnly /></div>
                  <div><Label>Grade</Label><Input value={scannedDetails.grade} readOnly /></div>
                  <div><Label>Test</Label><Input value={scannedDetails.testNumber} readOnly /></div>
                  <div><Label>Date</Label><Input value={scannedDetails.date} readOnly /></div>
                </div>
                <div>
                  <Label>Save to Class</Label>
                  <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class..." />
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
                        <TableHead className="text-right">Mark (Obtained/Total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scannedLearners.map((learner, index) => (
                        <TableRow key={index}>
                          <TableCell>{learner.name}</TableCell>
                          <TableCell className="text-right">
                             <Input
                              type="text"
                              value={learner.mark}
                              onChange={(e) => handleScannedMarkChange(index, e.target.value)}
                              className="w-28 text-right ml-auto"
                              placeholder="e.g. 42/50"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleSaveChanges} disabled={!selectedClassId} className="w-full">
                  <Save className="mr-2 h-4 w-4" /> Save to Class
                </Button>
              </div>
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