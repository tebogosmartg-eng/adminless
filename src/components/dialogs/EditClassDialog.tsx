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
import { ClassInfo } from "@/components/CreateClassDialog";
import { useClasses } from "@/context/ClassesContext";

interface EditClassDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  classInfo: ClassInfo | null;
}

export const EditClassDialog = ({ isOpen, onOpenChange, classInfo }: EditClassDialogProps) => {
  const { updateClassDetails } = useClasses();
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
      alert("Please fill in all fields.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update the details for your class below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="grade" className="text-right">
              Grade
            </Label>
            <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="className" className="text-right">
              Class Name
            </Label>
            <Input id="className" value={className} onChange={(e) => setClassName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};