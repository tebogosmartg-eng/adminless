import { Learner, GradeSymbol } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";
import { LearnerAnalyticsTrend } from "@/hooks/useLearnerAnalytics";
import { buildLearnerComment } from "@/utils/learnerComment";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

interface ProfileSummaryTabProps {
  learner: Learner;
  classSubject: string;
  currentSymbol: GradeSymbol | null;
  weightedAverage: number;
  trend: LearnerAnalyticsTrend;
  weakAreas: Array<{ assessmentTitle?: string | null }>;
  onSaveComment: (comment: string) => Promise<void>;
  isLocked?: boolean;
}

export const ProfileSummaryTab = ({
  learner,
  classSubject,
  currentSymbol,
  weightedAverage,
  trend,
  weakAreas,
  onSaveComment,
  isLocked = false,
}: ProfileSummaryTabProps) => {
  const generatedComment = useMemo(
    () => buildLearnerComment({ weightedAverage, trend, weakAreas }),
    [weightedAverage, trend, weakAreas]
  );
  const [commentDraft, setCommentDraft] = useState(learner.comment?.trim() || generatedComment);
  const [lastSavedComment, setLastSavedComment] = useState(learner.comment?.trim() || "");
  const [isSavingComment, setIsSavingComment] = useState(false);

  useEffect(() => {
    const existingComment = learner.comment?.trim() || "";
    setCommentDraft(existingComment || generatedComment);
    setLastSavedComment(existingComment);
  }, [learner.id, learner.comment, generatedComment]);

  const persistComment = async () => {
    if (isLocked) return;
    const normalizedDraft = commentDraft.trim();
    if (normalizedDraft === lastSavedComment) return;
    setIsSavingComment(true);
    try {
      await onSaveComment(normalizedDraft);
      setLastSavedComment(normalizedDraft);
    } finally {
      setIsSavingComment(false);
    }
  };

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
        <div className="space-y-2 p-4 bg-muted/50 rounded-md border relative">
          <Quote className="absolute top-2 left-2 h-8 w-8 text-muted-foreground/10 rotate-180" />
          <Textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            onBlur={persistComment}
            placeholder="Write a teacher comment..."
            className="relative z-10 min-h-24 bg-background/80"
            disabled={isLocked || isSavingComment}
          />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Suggested Comment</p>
            <p className="text-sm italic text-muted-foreground">
              "{generatedComment}"
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={persistComment}
              disabled={isLocked || isSavingComment || commentDraft.trim() === lastSavedComment}
            >
              Save Comment
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setCommentDraft(generatedComment)}
              disabled={isLocked || isSavingComment}
            >
              Use Suggestion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};