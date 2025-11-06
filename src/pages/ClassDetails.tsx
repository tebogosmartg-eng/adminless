import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, Save, Mic, Upload, ArrowUpDown, Users, MoreHorizontal } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';
import { VoiceEntryDialog } from '@/components/VoiceEntryDialog';
import { ImportMarksDialog } from '@/components/ImportMarksDialog';
import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/MarkDistributionChart';
import { EditLearnersDialog } from '@/components/EditLearnersDialog';

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Learner;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditLearnersOpen, setIsEditLearnersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setLearners(classInfo.learners);
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo) {
      const originalLearners = JSON.stringify(classInfo.learners.map(l => ({ name: l.name, mark: l.mark })).sort((a, b) => a.name.localeCompare(b.name)));
      const currentLearners = JSON.stringify(learners.map(l => ({ name: l.name, mark: l.mark })).sort((a, b) => a.name.localeCompare(b.name)));
      setHasUnsavedChanges(originalLearners !== currentLearners);
    }
  }, [learners, classInfo]);

  const sortedLearners = useMemo(() => {
    const itemsWithIndex = learners.map((learner, index) => ({
      ...learner,
      originalIndex: index,
    }));

    if (sortConfig.key) {
      itemsWithIndex.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        let comparison = 0;

        if (sortConfig.key === 'mark') {
          const parseMark = (mark: string) => {
            if (!mark || mark.trim() === '') return -Infinity;
            const num = parseFloat(mark);
            return isNaN(num) ? -Infinity : num;
          };
          const numA = parseMark(aVal);
          const numB = parseMark(bVal);
          if (numA > numB) comparison = 1;
          else if (numA < numB) comparison = -1;
        } else { // name
          if (aVal.toLowerCase() > bVal.toLowerCase()) comparison = 1;
          else if (aVal.toLowerCase() < bVal.toLowerCase()) comparison = -1;
        }
        return sortConfig.direction === 'descending' ? comparison * -1 : comparison;
      });
    }
    return itemsWithIndex;
  }, [learners, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

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
          <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges}>
            <Save className="mr-2 h-4 w-4" />
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
          <Button variant="outline" onClick={() => setIsVoiceEntryOpen(true)}>
            <Mic className="mr-2 h-4 w-4" /> Voice Entry
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditLearnersOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span>Manage Learners</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ClassStats learners={learners} />
      <MarkDistributionChart learners={learners} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Learner List</CardTitle>
            <CardDescription>
              Enter marks below or click headers to sort.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">#</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('name')}>
                    Learner Name
                    {sortConfig.key === 'name' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[150px]">
                   <Button variant="ghost" onClick={() => requestSort('mark')}>
                    Mark
                    {sortConfig.key === 'mark' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLearners.map((learner, index) => (
                <TableRow key={learner.originalIndex}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{learner.name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="Enter mark"
                      value={learner.mark}
                      onChange={(e) => handleMarkChange(learner.originalIndex, e.target.value)}
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
      <EditLearnersDialog
        isOpen={isEditLearnersOpen}
        onOpenChange={setIsEditLearnersOpen}
        classInfo={classInfo}
      />
    </>
  );
};

export default ClassDetails;