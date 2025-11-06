import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";

export interface ClassInfo {
  id: string;
  grade: string;
  subject: string;
  className: string;
  learners: string[];
}

interface CreateClassDialogProps {
  onClassCreate: (classInfo: ClassInfo) => void;
}

export const CreateClassDialog = ({ onClassCreate }: CreateClassDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [learners, setLearners] = useState("");

  const handleSubmit = () => {
    if (grade && subject && className && learners) {
      const learnerList = learners.split('\n').filter(name => name.trim() !== '');
      onClassCreate({
        id: new Date().toISOString(),
        grade,
        subject,
        className,
        learners: learnerList,
      });
      // Reset form and close dialog
      setGrade("");
      setSubject("");
      setClassName("");
      setLearners("");
      setIsOpen(false);
    } else {
      // Basic validation feedback
      alert("Please fill in all fields.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Class</DialogTitle>
          <DialogDescription>
            Fill in the details below to set up your class register.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="grade" className="text-right">
              Grade
            </Label>
            <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., Grade 10" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="className" className="text-right">
              Class Name
            </Label>
            <Input id="className" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g., 10A" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="learners" className="text-right pt-2">
              Learners
            </Label>
            <Textarea
              id="learners"
              value={learners}
              onChange={(e) => setLearners(e.target.value)}
              placeholder="Enter one learner name per line..."
              className="col-span-3"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Class</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};