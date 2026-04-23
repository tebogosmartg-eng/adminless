"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import { Layers } from "lucide-react";

import {
  Assessment,
  Rubric,
  AssessmentQuestion
} from "@/lib/types";

import { BulkQuestionImportDialog } from "./BulkQuestionImportDialog";
import { ReuseQuestionsDialog } from "./ReuseQuestionsDialog";
import { QuestionBuilder } from "./QuestionBuilder";
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
  const [classInfo, setClassInfo] = useState<any>(null);

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isReuseOpen, setIsReuseOpen] = useState(false);

  // 🔥 Load class info from Supabase
  useEffect(() => {
    const fetchClass = async () => {
      if (!assessment?.class_id) return;

      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", assessment.class_id)
        .single();

      if (!error) setClassInfo(data);
    };

    fetchClass();
  }, [assessment?.class_id]);

  const topicSuggestions = useTopicSuggestions(
    classInfo?.subject,
    classInfo?.grade
  );

  useEffect(() => {
    if (assessment) {
      setFormData({ ...assessment });
    }
  }, [assessment]);

  // 🔥 SAVE
  const handleSave = () => {
    if (
      (formData.title || "").trim() &&
      formData.max_mark !== undefined &&
      formData.weight !== undefined
    ) {
      onSave(formData as Assessment);
    }
  };

  // 🔥 RUBRIC SELECT
  const handleRubricSelect = (val: string) => {
    const rubricId = val === "none" ? null : val;
    const rubric = availableRubrics.find(r => r.id === rubricId);

    setFormData({
      ...formData,
      rubric_id: rubricId,
      max_mark: rubric ? rubric.total_points : formData.max_mark,
      questions: []
    });
  };

  // 🔥 QUESTIONS CHANGE
  const handleQuestionsChange = (updatedQuestions: AssessmentQuestion[]) => {
    const totalMax = updatedQuestions.reduce(
      (sum, q) => sum + (q.max_mark || 0),
      0
    );

    setFormData({
      ...formData,
      questions: updatedQuestions,
      max_mark: totalMax || formData.max_mark,
      rubric_id: updatedQuestions.length > 0 ? null : formData.rubric_id
    });
  };

  // 🔥 IMPORT QUESTIONS
  const handleImportQuestions = (
    importedQuestions: AssessmentQuestion[],
    mode: "append" | "replace"
  ) => {
    let updated = [...(formData.questions || [])];

    if (mode === "replace") {
      updated = importedQuestions;
    } else {
      updated = [...updated, ...importedQuestions];
    }

    const totalMax = updated.reduce(
      (sum, q) => sum + (q.max_mark || 0),
      0
    );

    setFormData({
      ...formData,
      questions: updated,
      max_mark: totalMax || formData.max_mark,
      rubric_id: null
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">

          <div className="shrink-0 p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>Assessment Settings</DialogTitle>
              <DialogDescription>
                Update the task structure and weighting.
              </DialogDescription>
            </DialogHeader>

            {/* FORM */}
            <div className="grid gap-4 pt-4">

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Title</Label>
                <Input
                  value={formData.title || ""}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="col-span-3 h-9"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Rubric</Label>

                <Select
                  value={formData.rubric_id || "none"}
                  onValueChange={handleRubricSelect}
                >
                  <SelectTrigger className="col-span-3 h-9">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">Standard Score</SelectItem>

                    {availableRubrics.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex gap-2 items-center">
                          <Layers className="h-3 w-3" />
                          {r.title} ({r.total_points})
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
                  onChange={e =>
                    setFormData({
                      ...formData,
                      max_mark: parseInt(e.target.value)
                    })
                  }
                  className="col-span-3 h-9"
                  disabled={
                    !!formData.rubric_id ||
                    (formData.questions?.length || 0) > 0
                  }
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs">Weight (%)</Label>
                <Input
                  type="number"
                  value={formData.weight || ""}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      weight: parseFloat(e.target.value)
                    })
                  }
                  className="col-span-3 h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <QuestionBuilder
              questions={formData.questions || []}
              onChange={handleQuestionsChange}
              topicSuggestions={topicSuggestions}
              disabled={!!formData.rubric_id}
              onOpenBulk={() => setIsBulkImportOpen(true)}
              onOpenReuse={() => setIsReuseOpen(true)}
            />
          </div>

          <DialogFooter className="shrink-0 border-t pt-4 px-6 pb-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* MODALS */}
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