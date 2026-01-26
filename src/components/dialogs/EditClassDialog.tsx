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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update the details for your class below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-grade" className="text-right">
              Grade
            </Label>
            <div className="col-span-3">
              <Input 
                id="edit-grade" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                list="edit-grades-list"
              />
              <datalist id="edit-grades-list">
                {savedGrades.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-subject" className="text-right">
              Subject
            </Label>
            <div className="col-span-3">
              <Input 
                id="edit-subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                list="edit-subjects-list"
              />
              <datalist id="edit-subjects-list">
                {savedSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-className" className="text-right">
              Class Name
            </Label>
            <Input id="edit-className" value={className} onChange={(e) => setClassName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};