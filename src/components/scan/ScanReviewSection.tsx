import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, PlusCircle, FileText, Eye, Target } from 'lucide-react';
import { ClassInfo, ScannedDetails, ScannedLearner, Assessment } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ScanReviewSectionProps {
  scannedDetails: ScannedDetails | null;
  scannedLearners: ScannedLearner[];
  classes: ClassInfo[];
  selectedClassId: string | undefined;
  setSelectedClassId: (id: string) => void;
  newClassName: string;
  setNewClassName: (name: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDetailsChange: (field: keyof ScannedDetails, value: string) => void;
  onLearnerChange: (index: number, field: keyof ScannedLearner, value: string) => void;
  onSaveToExisting: () => void;
  onCreateNew: () => void;
  imagePreviews?: string[];
  availableAssessments?: Assessment[];
  selectedAssessmentId?: string;
  setSelectedAssessmentId?: (id: string) => void;
}

export const ScanReviewSection = ({
  scannedDetails,
  scannedLearners,
  classes,
  selectedClassId,
  setSelectedClassId,
  newClassName,
  setNewClassName,
  activeTab,
  setActiveTab,
  onDetailsChange,
  onLearnerChange,
  onSaveToExisting,
  onCreateNew,
  imagePreviews = [],
  availableAssessments = [],
  selectedAssessmentId,
  setSelectedAssessmentId
}: ScanReviewSectionProps) => {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-sm">
      <CardHeader className="flex-shrink-0 border-b bg-muted/10">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-lg">2. Review & Save</CardTitle>
                <CardDescription className="text-xs">Verify the scanned data and save marks.</CardDescription>
            </div>
            {imagePreviews.length > 0 && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                            <Eye className="mr-2 h-3 w-3" /> Source
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                         <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 items-center bg-muted/20 rounded-md">
                            {imagePreviews.map((src, idx) => (
                                <img key={idx} src={src} alt={`Source ${idx + 1}`} className="max-w-full rounded shadow-md border" />
                            ))}
                         </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {scannedDetails && scannedLearners.length > 0 ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Body Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/20">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Subject</Label>
                  <Input 
                    value={scannedDetails.subject} 
                    onChange={(e) => onDetailsChange('subject', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Grade</Label>
                  <Input 
                    value={scannedDetails.grade} 
                    onChange={(e) => onDetailsChange('grade', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Test / Assessment</Label>
                  <Input 
                    value={scannedDetails.testNumber} 
                    onChange={(e) => onDetailsChange('testNumber', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Date</Label>
                  <Input 
                    value={scannedDetails.date} 
                    onChange={(e) => onDetailsChange('date', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Destination Selection */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="update" className="text-xs">Update Existing</TabsTrigger>
                  <TabsTrigger value="create" className="text-xs">Create New</TabsTrigger>
                </TabsList>
                
                <div className="pt-4 min-h-[80px]">
                  {activeTab === 'update' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Select Class</Label>
                            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {classes.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.subject} - {c.className}</SelectItem>
                                  ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {setSelectedAssessmentId && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Target Assessment</Label>
                                <Select onValueChange={setSelectedAssessmentId} value={selectedAssessmentId} disabled={!selectedClassId}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="New Assessment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-primary font-medium">
                                            <PlusCircle className="inline h-3 w-3 mr-2" />
                                            Create: "{scannedDetails.testNumber}"
                                        </SelectItem>
                                        {availableAssessments.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.title} (Max: {a.max_mark})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">New Class Name</Label>
                      <Input 
                        placeholder="e.g. 10A - Term 1" 
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
              </Tabs>

              {/* Data Table Area */}
              <div className="border rounded-md bg-background overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="text-[10px] h-8 py-0">Learner Name</TableHead>
                        <TableHead className="text-right text-[10px] h-8 py-0 w-24">Mark</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {scannedLearners.map((learner, index) => (
                        <TableRow key={index} className="hover:bg-muted/10 h-10">
                        <TableCell className="py-1">
                            <Input
                            type="text"
                            value={learner.name}
                            onChange={(e) => onLearnerChange(index, 'name', e.target.value)}
                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent transition-all"
                            />
                        </TableCell>
                        <TableCell className="py-1">
                            <Input
                            type="text"
                            value={learner.mark}
                            onChange={(e) => onLearnerChange(index, 'mark', e.target.value)}
                            className="h-7 text-xs text-right border-transparent hover:border-input focus:border-input bg-transparent transition-all"
                            />
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
            </div>

            {/* Pinned Action Area */}
            <div className="flex-shrink-0 p-4 border-t bg-muted/5">
              {activeTab === 'update' ? (
                <Button onClick={onSaveToExisting} disabled={!selectedClassId} className="w-full h-11 font-semibold shadow-sm">
                  <Save className="mr-2 h-4 w-4" /> Save Scanned Marks
                </Button>
              ) : (
                <Button onClick={onCreateNew} disabled={!newClassName} className="w-full h-11 font-semibold shadow-sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create & Save Class
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <FileText className="h-10 w-10 opacity-30" />
            </div>
            <h3 className="font-medium text-foreground/80 mb-1">Awaiting Data</h3>
            <p className="text-xs max-w-[200px]">Processed results will appear here for review before saving.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};