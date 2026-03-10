import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Assessment, Rubric, AssessmentQuestion, CognitiveLevel } from '@/lib/types';
import { Layers, Plus, Trash2, ListChecks, FileSpreadsheet, Library } from 'lucide-react';
import { BulkQuestionImportDialog } from './BulkQuestionImportDialog';
import { ReuseQuestionsDialog } from './ReuseQuestionsDialog';
import { TopicCombobox } from "./TopicCombobox";
import { useTopicSuggestions } from "@/hooks/useTopicSuggestions";

interface EditAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  onSave: (assessment: Assessment) => void;
  availableRubrics: Rubric[];
}

export const EditAssessmentDialog = ({
  open,
  onOpenChange,
  assessment,
  onSave,
  availableRubrics
}: EditAssessmentDialogProps) => {
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isReuseOpen, setIsReuseOpen] = useState(false);

  // Fetch contextual class info so we can refine suggestions by subject and grade
  const classInfo = useLiveQuery(() => assessment ? db.classes.get(assessment.class_id) : undefined, [assessment?.class_id]);
  const topicSuggestions = useTopicSuggestions(classInfo?.subject, classInfo?.grade);

  useEffect(() => {
    if (assessment) {
      setFormData({ ...assessment });
    }
  }, [assessment]);

  const handleSave = () => {
    if (formData.title && formData.max_mark !== undefined && formData.weight !== undefined) {
      onSave(formData as Assessment);
    }
  };

  const handleRubricSelect = (val: string) => {
      const rubricId = val === 'none' ? null : val;
      const rubric = availableRubrics.find(r => r.id === rubricId);
      
      setFormData({ 
          ...formData, 
          rubric_id: rubricId,
          max_mark: rubric ? rubric.total_points : formData.max_mark,
          questions: [] // Rubrics and questions are mutually exclusive
      });
  };

  const addQuestion = () => {
    const questions = [...(formData.questions || [])];
    const nextNum = questions.length + 1;
    questions.push({
      id: crypto.randomUUID(),
      question_number: `Q${nextNum}`,
      skill_description: "",
      topic: "",
      cognitive_level: "knowledge",
      max_mark: 10
    });
    
    const totalMax = questions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
    setFormData({ ...formData, questions, max_mark: totalMax, rubric_id: null });
  };

  const removeQuestion = (id: string) => {
    const questions = (formData.questions || []).filter((q: any) => q.id !== id);
    const totalMax = questions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
    setFormData({ ...formData, questions, max_mark: totalMax || (formData.max_mark || 50) });
  };

  const updateQuestion = (id: string, updates: Partial<AssessmentQuestion>) => {
    const questions = (formData.questions || []).map((q: any) => 
      q.id === id ? { ...q, ...updates } : q
    );
    const totalMax = questions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
    setFormData({ ...formData, questions, max_mark: totalMax });
  };

  const handleImportQuestions = (importedQuestions: AssessmentQuestion[], mode: 'append' | 'replace') => {
    let updatedQuestions = [...(formData.questions || [])];
    if (mode === 'replace') {
        updatedQuestions = importedQuestions;
    } else {
        updatedQuestions = [...updatedQuestions, ...importedQuestions];
    }
    const totalMax = updatedQuestions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
    setFormData({ ...formData, questions: updatedQuestions, max_mark: totalMax || formData.max_mark, rubric_id: null });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-2">
              <DialogHeader>
                  <DialogTitle>Assessment Settings</DialogTitle>
                  <DialogDescription>
                      Update the task structure and weighting.
                  </DialogDescription>
              </DialogHeader>
          </div>

          <ScrollArea className="flex-1 p-6 pt-0">
              <div className="grid gap-6 py-4">
                  <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Title</Label>
                          <Input 
                              value={formData.title || ""} 
                              onChange={e => setFormData({ ...formData, title: e.target.value })} 
                              className="col-span-3 h-9" 
                          />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Rubric</Label>
                          <Select value={formData.rubric_id || "none"} onValueChange={handleRubricSelect}>
                              <SelectTrigger className="col-span-3 h-9">
                                  <SelectValue placeholder="None (Standard Mark)" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">-- Standard Score --</SelectItem>
                                  {availableRubrics.map(r => (
                                      <SelectItem key={r.id} value={r.id}>
                                          <div className="flex items-center gap-2">
                                              <Layers className="h-3 w-3 text-muted-foreground" />
                                              {r.title} ({r.total_points} pts)
                                          </div>
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Max Mark</Label>
                          <Input 
                              type="number" 
                              value={formData.max_mark || ""} 
                              onChange={e => setFormData({ ...formData, max_mark: parseInt(e.target.value) })} 
                              className="col-span-3 h-9"
                              disabled={!!formData.rubric_id || (formData.questions && formData.questions.length > 0)}
                          />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs">Weight (%)</Label>
                          <Input 
                              type="number" 
                              value={formData.weight || ""} 
                              onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })} 
                              className="col-span-3 h-9" 
                          />
                      </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-bold">Question Breakdown</h4>
                          </div>
                          <div className="flex items-center gap-2">
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setIsReuseOpen(true)}
                                  disabled={!!formData.rubric_id}
                                  className="h-8"
                              >
                                  <Library className="h-3 w-3 mr-1" /> Reuse
                              </Button>
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setIsBulkImportOpen(true)}
                                  disabled={!!formData.rubric_id}
                                  className="h-8"
                              >
                                  <FileSpreadsheet className="h-3 w-3 mr-1" /> Bulk
                              </Button>
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={addQuestion}
                                  disabled={!!formData.rubric_id}
                                  className="h-8"
                              >
                                  <Plus className="h-3 w-3 mr-1" /> Add Q
                              </Button>
                          </div>
                      </div>

                      <div className="space-y-3">
                          {(formData.questions || []).map((q: AssessmentQuestion) => (
                              <div key={q.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/20">
                                  <div className="flex gap-2 items-start">
                                      <div className="w-16">
                                          <Label className="text-[10px] font-bold mb-1 block">Num</Label>
                                          <Input 
                                              value={q.question_number} 
                                              onChange={(e) => updateQuestion(q.id, { question_number: e.target.value })}
                                              className="h-8 text-xs font-bold bg-background"
                                          />
                                      </div>
                                      <div className="flex-1">
                                          <Label className="text-[10px] font-bold mb-1 block">Skill</Label>
                                          <Input 
                                              value={q.skill_description} 
                                              onChange={(e) => updateQuestion(q.id, { skill_description: e.target.value })}
                                              className="h-8 text-xs bg-background"
                                          />
                                      </div>
                                      <div className="w-20">
                                          <Label className="text-[10px] font-bold mb-1 block">Max</Label>
                                          <Input 
                                              type="number"
                                              value={q.max_mark} 
                                              onChange={(e) => updateQuestion(q.id, { max_mark: parseInt(e.target.value) || 0 })}
                                              className="h-8 text-xs text-center bg-background"
                                          />
                                      </div>
                                      <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeQuestion(q.id)}
                                          className="mt-5 h-8 w-8 text-muted-foreground hover:text-destructive"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </div>
                                  <div className="flex gap-2">
                                      <div className="flex-1">
                                          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Topic (Optional)</Label>
                                          <TopicCombobox
                                              value={q.topic || ""}
                                              onChange={(val) => updateQuestion(q.id, { topic: val })}
                                              suggestions={topicSuggestions}
                                              placeholder="e.g. Algebra"
                                          />
                                      </div>
                                      <div className="w-1/3">
                                          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Cog. Level</Label>
                                          <Select value={q.cognitive_level || "knowledge"} onValueChange={(v: CognitiveLevel) => updateQuestion(q.id, { cognitive_level: v })}>
                                              <SelectTrigger className="h-8 text-xs bg-background">
                                                  <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="knowledge">Knowledge</SelectItem>
                                                  <SelectItem value="comprehension">Comprehension</SelectItem>
                                                  <SelectItem value="application">Application</SelectItem>
                                                  <SelectItem value="analysis">Analysis</SelectItem>
                                                  <SelectItem value="evaluation">Evaluation</SelectItem>
                                                  <SelectItem value="creation">Creation</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-muted/5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <BulkQuestionImportDialog 
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImport={handleImportQuestions}
        existingQuestions={formData.questions}
      />

      <ReuseQuestionsDialog
        open={isReuseOpen}
        onOpenChange={setIsReuseOpen}
        onImport={handleImportQuestions}
        existingQuestionsCount={(formData.questions || []).length}
      />
    </>
  );
};