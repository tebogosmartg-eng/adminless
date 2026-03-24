import { useState, useEffect } from "react";
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
import { ClassInfo } from "@/lib/types";
import { useClasses } from "@/context/ClassesContext";
import { showError } from "@/utils/toast";
import { useSettings } from "@/context/SettingsContext";

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classInfo: ClassInfo | null;
}

export const EditClassDialog = ({ open, onOpenChange, classInfo }: EditClassDialogProps) => {
  const { updateClassDetails } = useClasses();
  const { savedSubjects, savedGrades } = useSettings();
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  useEffect(() => {
    if (classInfo) {
      setGrade(classInfo.grade);
      setSubject(classInfo.subject);
      setClassName(classInfo.className);
    }
  }, [classInfo]);

  const handleSubmit = () => {
    if (classInfo && grade && subject && className) {
      updateClassDetails(classInfo.id, { grade, subject, className });
      onOpenChange(false);
    } else {
      showError("Please fill in all fields.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update the details for your class below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="edit-grade" className="sm:text-right font-semibold">
              Grade
            </Label>
            <div className="sm:col-span-3 w-full">
              <Input 
                id="edit-grade" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                list="edit-grades-list"
                className="w-full"
              />
              <datalist id="edit-grades-list">
                {savedGrades.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="edit-subject" className="sm:text-right font-semibold">
              Subject
            </Label>
            <div className="sm:col-span-3 w-full">
              <Input 
                id="edit-subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                list="edit-subjects-list"
                className="w-full"
              />
              <datalist id="edit-subjects-list">
                {savedSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="edit-className" className="sm:text-right font-semibold">
              Class Name
            </Label>
            <Input 
                id="edit-className" 
                value={className} 
                onChange={(e) => setClassName(e.target.value)} 
                className="sm:col-span-3 w-full" 
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};