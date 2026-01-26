import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, BookOpen, GraduationCap } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess } from "@/utils/toast";

export const StandardListsSettings = () => {
  const { savedSubjects, addSubject, removeSubject, savedGrades, addGrade, removeGrade } = useSettings();
  const [newSubject, setNewSubject] = useState("");
  const [newGrade, setNewGrade] = useState("");

  const handleAddSubject = () => {
    if (newSubject.trim()) {
      addSubject(newSubject.trim());
      setNewSubject("");
      showSuccess("Subject added.");
    }
  };

  const handleAddGrade = () => {
    if (newGrade.trim()) {
      addGrade(newGrade.trim());
      setNewGrade("");
      showSuccess("Grade added.");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
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
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Mathematics" 
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
            />
            <Button onClick={handleAddSubject} disabled={!newSubject.trim()} size="icon">
                <Plus className="h-4 w-4" />
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
                        onClick={() => removeSubject(subject)}
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
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Grade 10" 
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGrade()}
            />
            <Button onClick={handleAddGrade} disabled={!newGrade.trim()} size="icon">
                <Plus className="h-4 w-4" />
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
                        onClick={() => removeGrade(grade)}
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
  );
};