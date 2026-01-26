import { Learner, GradeSymbol } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";

interface ProfileSummaryTabProps {
  learner: Learner;
  classSubject: string;
  currentSymbol: GradeSymbol | null;
}

export const ProfileSummaryTab = ({ learner, classSubject, currentSymbol }: ProfileSummaryTabProps) => {
  return (
    <div className="space-y-4 pt-4 h-full overflow-y-auto">
      <div className="flex items-center justify-center p-8 bg-muted/30 rounded-xl border border-dashed">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {classSubject}
          </p>
          <span className="text-6xl font-extrabold tracking-tight text-primary">
            {learner.mark ? `${learner.mark}%` : "N/A"}
          </span>
          <div className="mt-4 flex items-center justify-center gap-3">
            {currentSymbol ? (
              <>
                <Badge className={`text-lg px-4 py-1.5 ${currentSymbol.badgeColor}`} variant="outline">
                  {currentSymbol.symbol}
                </Badge>
                <span className="text-muted-foreground font-medium">
                  Level {currentSymbol.level}
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
        <div className="p-4 bg-muted/50 rounded-md border text-sm italic relative">
          <Quote className="absolute top-2 left-2 h-8 w-8 text-muted-foreground/10 rotate-180" />
          {learner.comment ? (
            <span className="relative z-10">"{learner.comment}"</span>
          ) : (
            <span className="text-muted-foreground not-italic relative z-10">No comment recorded yet.</span>
          )}
        </div>
      </div>
    </div>
  );
};