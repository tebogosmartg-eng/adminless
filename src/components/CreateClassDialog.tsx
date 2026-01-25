import { useState, useRef } from "react";
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
import { PlusCircle, Upload } from "lucide-react";
import Papa from "papaparse";
import { showSuccess, showError } from "@/utils/toast";

export interface Learner {
  name: string;
  mark: string;
  comment?: string;
  id?: string; // Optional ID for database tracking
}

export interface ClassInfo {
  id: string;
  grade: string;
  subject: string;
  className: string;
  learners: Learner[];
  archived?: boolean;
  notes?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (grade && subject && className && learners) {
      const learnerList = learners.split('\n')
        .filter(name => name.trim() !== '')
        .map(name => ({ name: name.trim(), mark: '' }));

      onClassCreate({
        id: new Date().toISOString(),
        grade,
        subject,
        className,
        learners: learnerList,
        archived: false,
        notes: ""
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          // Attempt to find names in the CSV
          // 1. If header "Name" or "Learner Name" exists
          // 2. Or just take first column
          
          let names: string[] = [];
          
          if (results.meta.fields && (results.meta.fields.includes("Name") || results.meta.fields.includes("Learner Name"))) {
             const field = results.meta.fields.includes("Name") ? "Name" : "Learner Name";
             names = (results.data as any[]).map(row => row[field]).filter(n => n);
          } else {
             // Take first column of first 100 rows
             names = (results.data as any[])
                .map(row => Array.isArray(row) ? row[0] : Object.values(row)[0])
                .filter(n => n && typeof n === 'string' && n.trim().length > 0) as string[];
          }

          if (names.length > 0) {
             const current = learners ? learners + "\n" : "";
             setLearners(current + names.join("\n"));
             showSuccess(`Imported ${names.length} names from CSV.`);
          } else {
             showError("Could not find names in CSV file.");
          }
          
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        header: true, // Try with header first
        skipEmptyLines: true
      });
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
            <div className="col-span-3 flex flex-col gap-2">
                <Textarea
                id="learners"
                value={learners}
                onChange={(e) => setLearners(e.target.value)}
                placeholder="Enter one learner name per line..."
                className="w-full"
                rows={6}
                />
                <div className="flex justify-end">
                   <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                     <Upload className="mr-2 h-3 w-3" /> Import CSV List
                   </Button>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".csv"
                      onChange={handleFileUpload}
                   />
                </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Class</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};