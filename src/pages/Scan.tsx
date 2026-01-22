import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Save, Loader2 } from 'lucide-react';
import { useClasses } from '../context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { processImagesWithGemini } from '@/services/gemini';

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

  const handleProcessImage = async () => {
    if (imagePreviews.length === 0) {
      showError("Please upload one or more images first.");
      return;
    }
    
    setIsProcessing(true);
    setScannedLearners([]);
    setScannedDetails(null);

    try {
      const result = await processImagesWithGemini(imagePreviews);
      
      setScannedDetails(result.details);
      setScannedLearners(result.learners);
      showSuccess(`Processed successfully! Found ${result.learners.length} learners.`);
    } catch (error) {
      console.error(error);
      showError("Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
      // Simple fuzzy match could be improved, currently doing exact case-insensitive match on name parts or full name
      // Let's try to find if the scanned name contains the learner name or vice versa
      const scannedMatch = scannedLearners.find(sl => {
        const slName = sl.name.toLowerCase();
        const lName = learner.name.toLowerCase();
        return slName.includes(lName) || lName.includes(slName);
      });

      if (scannedMatch) {
        try {
          // Normalize mark
          let percentage = "";
          const markStr = scannedMatch.mark.trim();

          if (markStr.includes("/")) {
            const parts = markStr.split('/');
            if (parts.length === 2) {
              const obtained = parseFloat(parts[0]);
              const total = parseFloat(parts[1]);
              if (!isNaN(obtained) && !isNaN(total) && total !== 0) {
                percentage = ((obtained / total) * 100).toFixed(1);
              }
            }
          } else if (markStr.includes("%")) {
            percentage = markStr.replace("%", "").trim();
          } else {
            // Assume raw number is percentage if no other context, or just store raw value
            // Ideally we want percentage for the app stats
             const num = parseFloat(markStr);
             if(!isNaN(num)) percentage = num.toString();
          }

          if (percentage) {
            matchedCount++;
            return { ...learner, mark: percentage };
          }
          
          return learner;
        } catch (e) {
          console.error(`Could not parse mark "${scannedMatch.mark}" for ${learner.name}.`, e);
          return learner; 
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
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing with Gemini AI...
                </>
              ) : (
                <><FileText className="mr-2 h-4 w-4" /> Process Images</>
              )}
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
                        <TableHead className="text-right">Mark</TableHead>
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
              <div className="flex items-center justify-center h-full text-center text-muted-foreground min-h-[200px]">
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