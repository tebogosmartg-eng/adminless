import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Learner } from "./CreateClassDialog";
import { GradeSymbol, getGradeSymbol } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";
import { Badge } from "@/components/ui/badge";
import { User, GraduationCap, Quote } from "lucide-react";

interface LearnerProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learner: Learner | null;
  classSubject: string;
}

export const LearnerProfileDialog = ({ isOpen, onOpenChange, learner, classSubject }: LearnerProfileDialogProps) => {
  const { gradingScheme } = useSettings();

  if (!learner) return null;

  const symbol = getGradeSymbol(learner.mark, gradingScheme);

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
      </DialogContent>
    </Dialog>
  );
};