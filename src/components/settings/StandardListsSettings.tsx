import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, BookOpen, GraduationCap, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess } from "@/utils/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const StandardListsSettings = () => {
  const { savedSubjects, addSubject, removeSubject, savedGrades, addGrade, removeGrade } = useSettings();
  const [newSubject, setNewSubject] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<string | null>(null);

  const handleAddSubject = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (newSubject.trim()) {
      addSubject(newSubject.trim());
      setNewSubject("");
      showSuccess("Subject added.");
      setStatusMessage("Saved ✓ Subject added.");
      return;
    }
    setErrorMessage("Enter a subject name before adding.");
  };

  const handleAddGrade = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (newGrade.trim()) {
      addGrade(newGrade.trim());
      setNewGrade("");
      showSuccess("Grade added.");
      setStatusMessage("Saved ✓ Grade added.");
      return;
    }
    setErrorMessage("Enter a grade name before adding.");
  };

  return (
    <div className="space-y-4">
      {statusMessage && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Subjects</CardTitle>
          </div>
          <CardDescription>
            Manage standard subjects for quick selection and consistent reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input 
              placeholder="e.g. Mathematics" 
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              className="w-full h-10 sm:col-span-2"
            />
            <Button onClick={handleAddSubject} disabled={!newSubject.trim()} className="w-full sm:w-auto h-10 sm:justify-self-end">
                <Plus className="h-4 w-4" />
                <span className="sm:hidden ml-2">Add Subject</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-muted/20 p-3 rounded-md border">
            {savedSubjects.length === 0 ? (
               <span className="text-sm text-muted-foreground w-full text-center py-4">No subjects added yet.</span>
            ) : (
                savedSubjects.map((subject) => (
                <Badge key={subject} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                    {subject}
                    <button 
                        onClick={() => setSubjectToDelete(subject)}
                        className="hover:text-destructive transition-colors focus:outline-none"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>Grades</CardTitle>
          </div>
          <CardDescription>
            Define the grades or forms you teach.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input 
              placeholder="e.g. Grade 10" 
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGrade()}
              className="w-full h-10 sm:col-span-2"
            />
            <Button onClick={handleAddGrade} disabled={!newGrade.trim()} className="w-full sm:w-auto h-10 sm:justify-self-end">
                <Plus className="h-4 w-4" />
                <span className="sm:hidden ml-2">Add Grade</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-muted/20 p-3 rounded-md border">
            {savedGrades.length === 0 ? (
               <span className="text-sm text-muted-foreground w-full text-center py-4">No grades added yet.</span>
            ) : (
                savedGrades.map((grade) => (
                <Badge key={grade} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                    {grade}
                    <button 
                        onClick={() => setGradeToDelete(grade)}
                        className="hover:text-destructive transition-colors focus:outline-none"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={subjectToDelete !== null} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove subject?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the subject from your standard list for future selections.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!subjectToDelete) return;
              removeSubject(subjectToDelete);
              showSuccess("Subject removed.");
              setStatusMessage("Saved ✓ Subject removed.");
              setSubjectToDelete(null);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={gradeToDelete !== null} onOpenChange={(open) => !open && setGradeToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove grade?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the grade from your standard list for future selections.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!gradeToDelete) return;
              removeGrade(gradeToDelete);
              showSuccess("Grade removed.");
              setStatusMessage("Saved ✓ Grade removed.");
              setGradeToDelete(null);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
};