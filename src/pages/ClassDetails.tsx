import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Save, Mic, Upload } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';
import { VoiceEntryDialog } from '@/components/VoiceEntryDialog';
import { ImportMarksDialog } from '@/components/ImportMarksDialog';
import ClassStats from '@/components/ClassStats';

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setLearners(classInfo.learners);
    }
  }, [classInfo]);

  const handleMarkChange = (index: number, mark: string) => {
    const updatedLearners = [...learners];
    updatedLearners[index] = { ...updatedLearners[index], mark };
    setLearners(updatedLearners);
  };

  const handleSaveChanges = () => {
    if (classId) {
      updateLearners(classId, learners);
      showSuccess("Marks have been saved successfully!");
    }
  };

  const handleUpdateAndSaveLearners = (updatedLearners: Learner[]) => {
    setLearners(updatedLearners);
    if (classId) {
      updateLearners(classId, updatedLearners);
    }
  };

  const handleExport = () => {
    if (!classInfo) {
      showError("Could not find class information to export.");
      return;
    }

    const csvHeader = "Learner Name,Mark\n";
    const csvRows = learners
      .map(learner => `"${learner.name.replace(/"/g, '""')}",${learner.mark}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `${classInfo.grade}_${classInfo.subject}_${classInfo.className}_Marks.csv`.replace(/\s+/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Marks exported successfully!");
    } else {
      showError("Export feature is not supported in your browser.");
    }
  };

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Class not found</h2>
        <p className="text-muted-foreground mt-2">The class you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link to="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link to="/classes" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Link>
          <h1 className="text-3xl font-bold">{classInfo.subject} - {classInfo.className}</h1>
          <p className="text-muted-foreground">{classInfo.grade}</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" onClick={() => setIsVoiceEntryOpen(true)}>
            <Mic className="mr-2 h-4 w-4" /> Voice Entry
          </Button>
          <Button variant="outline" onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" /> Save Marks
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import Marks
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Marks
          </Button>
        </div>
      </div>

      <ClassStats learners={learners} />

      <Card>
        <CardHeader>
          <CardTitle>Learner List</CardTitle>
          <CardDescription>
            Enter the mark for each learner below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">#</TableHead>
                <TableHead>Learner Name</TableHead>
                <TableHead className="text-right w-[150px]">Mark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((learner, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{learner.name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="Enter mark"
                      value={learner.mark}
                      onChange={(e) => handleMarkChange(index, e.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <VoiceEntryDialog 
        isOpen={isVoiceEntryOpen}
        onOpenChange={setIsVoiceEntryOpen}
        learners={learners}
        onComplete={handleUpdateAndSaveLearners}
      />
      <ImportMarksDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        classInfo={classInfo}
        onImportComplete={handleUpdateAndSaveLearners}
      />
    </>
  );
};

export default ClassDetails;