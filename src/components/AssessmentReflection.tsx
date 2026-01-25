import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, FilePenLine, Check } from 'lucide-react';
import { useClasses } from '@/context/ClassesContext';
import { showSuccess } from '@/utils/toast';

interface AssessmentReflectionProps {
  classId: string;
  initialNotes: string;
}

export const AssessmentReflection = ({ classId, initialNotes }: AssessmentReflectionProps) => {
  const { updateClassNotes } = useClasses();
  const [notes, setNotes] = useState(initialNotes);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setIsSaved(false);
  };

  const handleSave = () => {
    updateClassNotes(classId, notes);
    setIsSaved(true);
    showSuccess("Assessment notes saved.");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                   <FilePenLine className="h-4 w-4 text-primary" />
                </div>
                <div>
                   <CardTitle className="text-lg">Assessment Notes</CardTitle>
                   <CardDescription>Reflections & Reminders</CardDescription>
                </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={isSaved} variant={isSaved ? "outline" : "default"}>
                {isSaved ? <Check className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {isSaved ? "Saved" : "Save Notes"}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <Textarea 
          placeholder="Write your reflections on this assessment here. e.g. 'Questions 4 and 5 were challenging for most learners. Review algebra basics next term.'"
          className="h-full min-h-[150px] resize-none text-sm leading-relaxed bg-muted/20"
          value={notes}
          onChange={handleChange}
        />
      </CardContent>
    </Card>
  );
};