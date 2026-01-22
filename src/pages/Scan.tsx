import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Save, Loader2, PlusCircle, Users } from 'lucide-react';
import { useClasses } from '../context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from '@/utils/toast';
import { processImagesWithGemini } from '@/services/gemini';
import { useNavigate } from 'react-router-dom';

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
  const { classes, updateLearners, addClass } = useClasses();
  const navigate = useNavigate();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  
  // State for "Update Existing"
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  
  // State for "Create New"
  const [newClassName, setNewClassName] = useState("");
  const [activeTab, setActiveTab] = useState("update");

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
      
      // Auto-populate new class name if detected
      if (result.details) {
        setNewClassName(`${result.details.grade} - ${result.details.testNumber || 'Test'}`);
      }
      
      showSuccess(`Processed successfully! Found ${result.learners.length} learners.`);
    } catch (error: any) {
      console.error(error);
      showError(error.message || "Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetailsChange = (field: keyof ScannedDetails, value: string) => {
    if (scannedDetails) {
      setScannedDetails({ ...scannedDetails, [field]: value });
    }
  };

  const handleScannedMarkChange = (index: number, newMark: string) => {
    const updatedScannedLearners = [...scannedLearners];
    updatedScannedLearners[index].mark = newMark;
    setScannedLearners(updatedScannedLearners);
  };

  const handleScannedNameChange = (index: number, newName: string) => {
    const updatedScannedLearners = [...scannedLearners];
    updatedScannedLearners[index].name = newName;
    setScannedLearners(updatedScannedLearners);
  };

  const handleSaveToExisting = () => {
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
      // Simple fuzzy match could be improved
      const scannedMatch = scannedLearners.find(sl => {
        const slName = sl.name.toLowerCase();
        const lName = learner.name.toLowerCase();
        return slName.includes(lName) || lName.includes(slName);
      });

      if (scannedMatch) {
        try {
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
    
    // Cleanup
    setImagePreviews([]);
    setScannedLearners([]);
    setScannedDetails(null);
    setSelectedClassId(undefined);
    navigate(`/classes/${selectedClassId}`);
  };

  const handleCreateNewClass = () => {
    if (!scannedDetails || !newClassName) {
      showError("Please ensure all class details are filled out.");
      return;
    }

    const newLearners = scannedLearners.map(sl => {
      // Normalize marks to percentage if possible, else keep raw
      let mark = sl.mark;
      const markStr = sl.mark.trim();
      
      if (markStr.includes("/")) {
        const parts = markStr.split('/');
        if (parts.length === 2) {
          const obtained = parseFloat(parts[0]);
          const total = parseFloat(parts[1]);
          if (!isNaN(obtained) && !isNaN(total) && total !== 0) {
            mark = ((obtained / total) * 100).toFixed(1);
          }
        }
      } else if (markStr.includes("%")) {
        mark = markStr.replace("%", "").trim();
      }

      return {
        name: sl.name,
        mark: mark
      };
    });

    const newClass = {
      id: new Date().toISOString(),
      grade: scannedDetails.grade,
      subject: scannedDetails.subject,
      className: newClassName,
      learners: newLearners
    };

    addClass(newClass);
    showSuccess(`Created new class "${newClassName}" with ${newLearners.length} learners.`);
    
    // Cleanup
    setImagePreviews([]);
    setScannedLearners([]);
    setScannedDetails(null);
    setNewClassName("");
    navigate(`/classes/${newClass.id}`);
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
            <CardDescription>Verify the scanned data and save marks.</CardDescription>
          </CardHeader>
          <CardContent>
            {scannedDetails && scannedLearners.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                   {/* Editable Details */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <Input 
                      value={scannedDetails.subject} 
                      onChange={(e) => handleDetailsChange('subject', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Grade</Label>
                    <Input 
                      value={scannedDetails.grade} 
                      onChange={(e) => handleDetailsChange('grade', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Test / Assessment</Label>
                    <Input 
                      value={scannedDetails.testNumber} 
                      onChange={(e) => handleDetailsChange('testNumber', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input 
                      value={scannedDetails.date} 
                      onChange={(e) => handleDetailsChange('date', e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="update">Update Existing Class</TabsTrigger>
                    <TabsTrigger value="create">Create New Class</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="update" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Select Class to Update</Label>
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
                      <p className="text-xs text-muted-foreground">
                        We will match scanned names with names in the selected class.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="create" className="space-y-4 pt-4">
                     <div className="space-y-2">
                      <Label>New Class Name</Label>
                      <Input 
                        placeholder="e.g. 10A - Term 1" 
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        All scanned learners will be added to this new class.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="max-h-64 overflow-y-auto border rounded-md">
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
                          <TableCell>
                             <Input
                              type="text"
                              value={learner.name}
                              onChange={(e) => handleScannedNameChange(index, e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                             <Input
                              type="text"
                              value={learner.mark}
                              onChange={(e) => handleScannedMarkChange(index, e.target.value)}
                              className="w-20 text-right ml-auto h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {activeTab === 'update' ? (
                  <Button onClick={handleSaveToExisting} disabled={!selectedClassId} className="w-full">
                    <Save className="mr-2 h-4 w-4" /> Save to Existing Class
                  </Button>
                ) : (
                  <Button onClick={handleCreateNewClass} disabled={!newClassName} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create & Save Class
                  </Button>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground min-h-[200px]">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
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