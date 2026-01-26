import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, PlusCircle, FileText } from 'lucide-react';
import { ClassInfo } from '@/lib/types';
import { ScannedDetails, ScannedLearner } from '@/hooks/useScanLogic';

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
  onCreateNew
}: ScanReviewSectionProps) => {
  return (
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
                  onChange={(e) => onDetailsChange('subject', e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Grade</Label>
                <Input 
                  value={scannedDetails.grade} 
                  onChange={(e) => onDetailsChange('grade', e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Test / Assessment</Label>
                <Input 
                  value={scannedDetails.testNumber} 
                  onChange={(e) => onDetailsChange('testNumber', e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input 
                  value={scannedDetails.date} 
                  onChange={(e) => onDetailsChange('date', e.target.value)}
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
                          onChange={(e) => onLearnerChange(index, 'name', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                         <Input
                          type="text"
                          value={learner.mark}
                          onChange={(e) => onLearnerChange(index, 'mark', e.target.value)}
                          className="w-20 text-right ml-auto h-8"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {activeTab === 'update' ? (
              <Button onClick={onSaveToExisting} disabled={!selectedClassId} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save to Existing Class
              </Button>
            ) : (
              <Button onClick={onCreateNew} disabled={!newClassName} className="w-full">
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
  );
};