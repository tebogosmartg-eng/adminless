import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClasses } from '@/context/ClassesContext';
import { useNotesLogic } from '@/hooks/useNotesLogic';
import { LearnerNote } from '@/lib/types';
import { Search } from 'lucide-react';

interface GlobalAddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalAddNoteDialog = ({ open, onOpenChange }: GlobalAddNoteDialogProps) => {
  const { classes } = useClasses();
  const { addNoteGlobal } = useNotesLogic();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>("");
  const [category, setCategory] = useState<LearnerNote['category']>("general");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");

  const activeClasses = useMemo(() => classes.filter(c => !c.archived), [classes]);
  
  const selectedClass = useMemo(() => 
    activeClasses.find(c => c.id === selectedClassId), 
  [activeClasses, selectedClassId]);

  // If class selected, filter by class. If not, search all.
  const availableLearners = useMemo(() => {
    let list = selectedClass ? selectedClass.learners : activeClasses.flatMap(c => c.learners.map(l => ({ ...l, className: c.className })));
    
    if (learnerSearch) {
        list = list.filter(l => l.name.toLowerCase().includes(learnerSearch.toLowerCase()));
    }
    
    // If no class selected and no search, don't show huge list
    if (!selectedClass && !learnerSearch) return [];

    return list;
  }, [selectedClass, activeClasses, learnerSearch]);

  const handleSubmit = async () => {
    if (!selectedLearnerId || !content.trim()) return;
    
    const success = await addNoteGlobal(selectedLearnerId, content, category, date);
    if (success) {
        setContent("");
        onOpenChange(false);
    }
  };

  const reset = () => {
      setSelectedClassId("");
      setSelectedLearnerId("");
      setLearnerSearch("");
      setContent("");
      setCategory("general");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Quick Note</DialogTitle>
          <DialogDescription>Record an observation for any learner.</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Class</Label>
                <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedLearnerId(""); }}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Filter by Class (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all_classes">-- All Classes --</SelectItem>
                        {activeClasses.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.subject} - {c.className}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Learner</Label>
                <div className="col-span-3 space-y-2">
                    {!selectedClass && (
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search name..." 
                                className="pl-8" 
                                value={learnerSearch}
                                onChange={(e) => setLearnerSearch(e.target.value)}
                            />
                        </div>
                    )}
                    <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId} disabled={!selectedClass && availableLearners.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Learner" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLearners.map((l: any) => (
                                <SelectItem key={l.id || l.name} value={l.id || ""}>
                                    {l.name} {l.className ? `(${l.className})` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Details</Label>
                <div className="col-span-3 flex gap-2">
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                        <SelectTrigger className="w-full">
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
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Note</Label>
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter observation..."
                    rows={3}
                />
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!selectedLearnerId || !content.trim()}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};