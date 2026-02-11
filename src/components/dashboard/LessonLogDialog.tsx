import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, Save, ClipboardList, Check } from 'lucide-react';
import { useLessonLogs } from '@/hooks/useLessonLogs';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import { cn } from '@/lib/utils';

interface LessonLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  className: string;
  subject: string;
  grade: string;
  date: string;
}

export const LessonLogDialog = ({ open, onOpenChange, timetableId, className, subject, grade, date }: LessonLogDialogProps) => {
  const { log, saveLog } = useLessonLogs(timetableId, date);
  const { data: curriculum } = useCurriculumProgress(subject, grade);
  
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  useEffect(() => {
    if (log) {
      setContent(log.content);
      setHomework(log.homework || "");
      setSelectedTopicIds(log.topic_ids || []);
    } else {
      setContent("");
      setHomework("");
      setSelectedTopicIds([]);
    }
  }, [log, open]);

  const toggleTopic = (id: string) => {
    setSelectedTopicIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    await (saveLog as any)(content, homework, selectedTopicIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Lesson Journal: {className}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> {date} • {subject} ({grade})
            </DialogDescription>
            </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Topic Covered</Label>
            <div className="flex flex-wrap gap-2">
                {curriculum?.topics.map(topic => (
                    <Badge 
                        key={topic.id}
                        variant={selectedTopicIds.includes(topic.id) ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer px-3 py-1 text-[10px] transition-all",
                            selectedTopicIds.includes(topic.id) ? "bg-primary text-white border-primary" : "hover:border-primary/50"
                        )}
                        onClick={() => toggleTopic(topic.id)}
                    >
                        {selectedTopicIds.includes(topic.id) && <Check className="h-2.5 w-2.5 mr-1" />}
                        {topic.title}
                    </Badge>
                ))}
                {(!curriculum || curriculum.topics.length === 0) && (
                    <p className="text-[10px] text-muted-foreground italic">No topics defined in Curriculum Settings for this class.</p>
                )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Work Covered (Detail)</Label>
            <Textarea 
              placeholder="What specific content was taught today?" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
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

        <DialogFooter className="p-6 pt-2 border-t bg-muted/5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!content.trim()}>
            <Save className="mr-2 h-4 w-4" /> Save Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};