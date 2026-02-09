import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Calendar, Save, ClipboardList } from 'lucide-react';
import { useLessonLogs } from '@/hooks/useLessonLogs';

interface LessonLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  className: string;
  date: string;
}

export const LessonLogDialog = ({ open, onOpenChange, timetableId, className, date }: LessonLogDialogProps) => {
  const { log, saveLog } = useLessonLogs(timetableId, date);
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");

  useEffect(() => {
    if (log) {
      setContent(log.content);
      setHomework(log.homework || "");
    } else {
      setContent("");
      setHomework("");
    }
  }, [log, open]);

  const handleSave = async () => {
    await saveLog(content, homework);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Lesson Journal: {className}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> {date}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Work Covered</Label>
            <Textarea 
              placeholder="What topics were covered today?" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3" /> Homework Assigned
            </Label>
            <Textarea 
              placeholder="Tasks given for next session..." 
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              rows={2}
              className="bg-muted/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!content.trim()}>
            <Save className="mr-2 h-4 w-4" /> Save Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};