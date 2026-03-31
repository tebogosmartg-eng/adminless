import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Assessment, Rubric, AssessmentQuestion } from '@/lib/types';
import { Layers } from 'lucide-react';
import { BulkQuestionImportDialog } from './BulkQuestionImportDialog';
import { ReuseQuestionsDialog } from './ReuseQuestionsDialog';
import { QuestionBuilder } from './QuestionBuilder';
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

  const classInfo = useLiveQuery(() => assessment ? db.classes.get(assessment.class_id) : undefined, [assessment?.class_id]);
  const topicSuggestions = useTopicSuggestions(classInfo?.subject, classInfo?.grade);

  useEffect(() => {
    if (assessment) {
      setFormData({ ...assessment });
    }
  }, [assessment]);

  const handleSave = () => {
    if ((formData.title || '').trim() && formData.max_mark !== undefined && formData.weight !== undefined) {
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
          questions: [] 
      });
  };

  const handleQuestionsChange = (updatedQuestions: AssessmentQuestion[]) => {
      const totalMax = updatedQuestions.reduce((sum, q) => sum + (q.max_mark || 0), 0);
      setFormData({ 
          ...formData, 
          questions: updatedQuestions, 
          max_mark: totalMax || formData.max_mark, 
          rubric_id: updatedQuestions.length > 0 ? null : formData.rubric_id 
      });
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
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-2 shrink-0">
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

                  <div className="border-t pt-4">
                      <QuestionBuilder 
                          questions={formData.questions || []}
                          onChange={handleQuestionsChange}
                          topicSuggestions={topicSuggestions}
                          disabled={!!formData.rubric_id}
                          onOpenBulk={() => setIsBulkImportOpen(true)}
                          onOpenReuse={() => setIsReuseOpen(true)}
                      />
                  </div>
              </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-muted/5 shrink-0">
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