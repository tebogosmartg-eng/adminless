import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useLearnerNotes } from '@/hooks/useLearnerNotes';
import { LearnerNote } from '@/lib/types';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, MessageCircle, ThumbsUp, Trash2, Plus, StickyNote, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileNotesTabProps {
  learnerId?: string;
  isLocked?: boolean;
}

export const ProfileNotesTab = ({ learnerId, isLocked = false }: ProfileNotesTabProps) => {
  const { notes, loading, addNote, deleteNote } = useLearnerNotes(learnerId, isLocked);
  const safeNotes = notes ?? [];
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<LearnerNote['category']>("general");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      await addNote(content, category, date);
      setContent("");
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'behavior': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'academic': return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'parent': return <MessageCircle className="h-4 w-4 text-purple-500" />;
      default: return <StickyNote className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!learnerId) {
    return <div className="text-center py-10 text-muted-foreground">Save learner first to add notes.</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4 pt-4">
      <Card className="flex-shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Select value={category ?? ""} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="behavior">Behavior</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="parent">Parent Contact</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-[140px]" 
            />
          </div>
          <Textarea 
            placeholder="Add a note..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none"
            rows={2}
            disabled={isSaving || isLocked}
          />
          <Button onClick={handleSubmit} disabled={!content.trim() || isSaving || isLocked} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Add Note"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : isSaving && safeNotes.length === 0 ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : safeNotes.length > 0 ? (
          safeNotes.map(note => (
            <div key={note.id} className="border rounded-lg p-3 bg-card hover:bg-muted/20 transition-colors flex gap-3 group">
              <div className="mt-1 flex-shrink-0">
                {getIcon(note.category)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize text-muted-foreground">{note.category}</span>
                    <span className="text-xs text-muted-foreground">
                      • {note.date ? format(new Date(note.date), 'dd MMM yyyy') : 'Unknown date'}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNote(note.id)}
                    disabled={isLocked}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No notes recorded"
            description="Use the form above to add the first learner note."
            icon={<StickyNote className="h-12 w-12 opacity-20" />}
          />
        )}
      </div>
    </div>
  );
};