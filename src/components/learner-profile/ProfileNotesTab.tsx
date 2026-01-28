import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useLearnerNotes } from '@/hooks/useLearnerNotes';
import { LearnerNote } from '@/lib/types';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, MessageCircle, ThumbsUp, Trash2, Plus, StickyNote, Edit2, Save, X } from 'lucide-react';

interface ProfileNotesTabProps {
  learnerId?: string;
}

export const ProfileNotesTab = ({ learnerId }: ProfileNotesTabProps) => {
  const { notes, addNote, updateNote, deleteNote } = useLearnerNotes(learnerId);
  
  // New Note State
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<LearnerNote['category']>("general");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<LearnerNote['category']>("general");
  const [editDate, setEditDate] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    addNote(content, category, date);
    setContent("");
  };

  const startEdit = (note: LearnerNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
    setEditDate(note.date);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = () => {
    if (editingId && editContent.trim()) {
      updateNote(editingId, {
        content: editContent,
        category: editCategory,
        date: editDate
      });
      setEditingId(null);
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
      {/* Input Area */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
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
          />
          <Button onClick={handleSubmit} disabled={!content.trim()} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {notes && notes.length > 0 ? (
          notes.map(note => (
            <div key={note.id} className="border rounded-lg p-3 bg-card hover:bg-muted/10 transition-colors flex gap-3 group">
              {editingId === note.id ? (
                <div className="flex-1 space-y-2">
                   <div className="flex gap-2">
                      <Select value={editCategory} onValueChange={(v: any) => setEditCategory(v)}>
                        <SelectTrigger className="h-8 w-[130px]">
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
                        value={editDate} 
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-8 w-[130px]" 
                      />
                   </div>
                   <Textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                   />
                   <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3 w-3 mr-1"/> Cancel</Button>
                      <Button size="sm" onClick={saveEdit}><Save className="h-3 w-3 mr-1"/> Save</Button>
                   </div>
                </div>
              ) : (
                <>
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(note.category)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold capitalize text-muted-foreground">{note.category}</span>
                        <span className="text-xs text-muted-foreground">• {format(new Date(note.date), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => startEdit(note)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No notes recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
};