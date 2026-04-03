"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { showError, showSuccess } from "@/utils/toast";
import { PlusCircle } from "lucide-react";

interface CreateClassInlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (classId: string) => void;
}

export const CreateClassInlineDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateClassInlineDialogProps) => {
  const { classes, addClass } = useClasses();
  const { savedSubjects, savedGrades } = useSettings();
  const { activeYear, activeTerm } = useAcademic();

  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const handleSubmit = async () => {
    if (!className.trim()) {
      showError("Class Name is required.");
      return;
    }

    if (!activeYear || !activeTerm) {
      showError("No active academic session found. Please select a Year and Term first.");
      return;
    }

    // Check for duplicates in current term
    const isDuplicate = classes.some(
      (c) =>
        c.className.toLowerCase() === className.trim().toLowerCase() &&
        c.term_id === activeTerm.id
    );

    if (isDuplicate) {
      showError(`A class named "${className}" already exists in ${activeTerm.name}.`);
      return;
    }

    const newId = crypto.randomUUID();
    
    await addClass({
      id: newId,
      year_id: activeYear.id,
      term_id: activeTerm.id,
      grade: grade || "Unassigned",
      subject: subject || "General",
      className: className.trim(),
      learners: [], // Empty roster, to be populated by scan or manual edit later
      archived: false,
      notes: "Created during scan extraction."
    });

    showSuccess(`Class "${className}" created.`);
    onSuccess(newId);
    
    // Reset and close
    setGrade("");
    setSubject("");
    setClassName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Create New Class
          </DialogTitle>
          <DialogDescription>
            Quickly set up a target for your scanned data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="inline-className">Class Name (e.g. 10A)</Label>
            <Input
              id="inline-className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Required"
              autoFocus
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inline-grade">Grade</Label>
              <Input
                id="inline-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                list="inline-grades-list"
                placeholder="Optional"
                className="h-10"
              />
              <datalist id="inline-grades-list">
                {savedGrades.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-subject">Subject</Label>
              <Input
                id="inline-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                list="inline-subjects-list"
                placeholder="Optional"
                className="h-10"
              />
              <datalist id="inline-subjects-list">
                {savedSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto h-10 font-bold">
            Create & Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};