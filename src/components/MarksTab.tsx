import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/charts/MarkDistributionChart';
import { AssessmentReflection } from '@/components/AssessmentReflection';
import { LearnerList } from '@/components/learner-list/LearnerList';
import { Learner, GradeSymbol } from '@/lib/types';

interface MarksTabProps {
  learners: Learner[];
  showComments: boolean;
  gradingScheme: GradeSymbol[];
  isGeneratingComments: boolean;
  classId: string;
  notes: string;
  onGenerateComments: () => void;
  onMarkChange: (index: number, mark: string) => void;
  onCommentChange: (index: number, comment: string) => void;
  onRenameLearner: (index: number, name: string) => void;
  onRemoveLearner: (index: number) => void;
  onProfileClick: (learner: Learner) => void;
  onAddLearnerClick: () => void;
  onBatchDelete: (indices: number[]) => void;
  onBatchComment: (indices: number[], comment: string) => void;
  onBatchClearMarks: (indices: number[]) => void;
  isLoading?: boolean;
}

export const MarksTab = ({
  learners,
  showComments,
  gradingScheme,
  isGeneratingComments,
  classId,
  notes,
  onGenerateComments,
  onMarkChange,
  onCommentChange,
  onRenameLearner,
  onRemoveLearner,
  onProfileClick,
  onAddLearnerClick,
  onBatchDelete,
  onBatchComment,
  onBatchClearMarks,
  isLoading = false,
}: MarksTabProps) => {
  return (
    <div className="space-y-6 mt-4">
      {!showComments && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ClassStats learners={learners} />
          </div>
          <div className="lg:col-span-1">
            <MarkDistributionChart
              learners={learners}
              title="Grade Distribution"
              description="Symbol frequency"
            />
          </div>
          <div className="lg:col-span-1">
            <AssessmentReflection classId={classId} initialNotes={notes} />
          </div>
        </div>
      )}

      <LearnerList
        learners={learners}
        showComments={showComments}
        gradingScheme={gradingScheme}
        isGeneratingComments={isGeneratingComments}
        onGenerateComments={onGenerateComments}
        onMarkChange={onMarkChange}
        onCommentChange={onCommentChange}
        onRenameLearner={onRenameLearner}
        onRemoveLearner={onRemoveLearner}
        onProfileClick={onProfileClick}
        onAddLearnerClick={onAddLearnerClick}
        onBatchDelete={onBatchDelete}
        onBatchComment={onBatchComment}
        onBatchClearMarks={onBatchClearMarks}
        isLoading={isLoading}
      />
    </div>
  );
};