import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Save } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess } from '@/utils/toast';

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateClass } = useClasses();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);

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
      updateClass(classId, learners);
      showSuccess("Marks have been saved successfully!");
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" /> Save Marks
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" /> Export Marks
          </Button>
        </div>
      </div>

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
    </>
  );
};

export default ClassDetails;