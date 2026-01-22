import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Learner } from "./CreateClassDialog";
import { GradeSymbol, getGradeSymbol } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";
import { Badge } from "@/components/ui/badge";
import { User, Quote, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateLearnerReportPDF } from "@/utils/pdfGenerator";
import { showSuccess } from "@/utils/toast";

interface LearnerProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learner: Learner | null;
  classSubject: string;
}

export const LearnerProfileDialog = ({ isOpen, onOpenChange, learner, classSubject }: LearnerProfileDialogProps) => {
  const { gradingScheme, schoolName, teacherName } = useSettings();

  if (!learner) return null;

  const symbol = getGradeSymbol(learner.mark, gradingScheme);

  const handleDownloadReport = () => {
    // We need to parse grade/subject/className from the combined string "Grade 10 Mathematics" passed as classSubject
    // Ideally we'd pass the full classInfo object, but for now we'll approximate or use what we have.
    // Actually, looking at parent usage, it passes `${classInfo.grade} ${classInfo.subject}`.
    // Let's rely on the user or context, but since we don't have full class object here, we'll use classSubject as "Subject".
    
    // A better approach: The PDF generator takes specific fields. We can pass classSubject as Subject for now.
    // To fix this properly, I should probably pass the classInfo object prop in the future, 
    // but for now let's split the string or just use it.
    
    // NOTE: In the parent component (ClassDetails), it passes `${classInfo.grade} ${classInfo.subject}`.
    // Let's create a temporary object to satisfy the PDF generator.
    
    const tempClassInfo = {
      subject: classSubject,
      grade: "", // Included in subject string effectively
      className: "" 
    };

    generateLearnerReportPDF(learner, tempClassInfo, gradingScheme, schoolName, teacherName);
    showSuccess(`Report downloaded for ${learner.name}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            {learner.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            Performance Report for {classSubject}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed">
            <div className="text-center">
              <span className="text-5xl font-extrabold tracking-tight text-primary">
                {learner.mark ? `${learner.mark}%` : "N/A"}
              </span>
              <div className="mt-2 flex items-center justify-center gap-2">
                {symbol ? (
                  <>
                    <Badge className="text-lg px-3 py-1" variant="secondary">
                      {symbol.symbol}
                    </Badge>
                    <span className="text-muted-foreground text-sm font-medium">
                      Level {symbol.level}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No Grade Assigned</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground">
              <Quote className="h-4 w-4" /> Teacher's Comment
            </h4>
            <div className="p-4 bg-muted/50 rounded-md border text-sm italic">
              {learner.comment ? (
                `"${learner.comment}"`
              ) : (
                <span className="text-muted-foreground not-italic">No comment recorded yet.</span>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={handleDownloadReport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Download Report Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};