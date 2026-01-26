import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/charts/MarkDistributionChart';
import { AssessmentReflection } from '@/components/AssessmentReflection';
import { LearnerList } from '@/components/learner-list/LearnerList';
import { Learner } from '@/components/CreateClassDialog';
import { GradeSymbol } from '@/utils/grading';

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
  onRemoveLearner: (index: number) => void;
  onProfileClick: (learner: Learner) => void;
  onAddLearnerClick: () => void;
  onBatchDelete: (indices: number[]) => void;
  onBatchComment: (indices: number[], comment: string) => void;
  onBatchClearMarks: (indices: number[]) => void;
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
  onRemoveLearner,
  onProfileClick,
  onAddLearnerClick,
  onBatchDelete,
  onBatchComment,
  onBatchClearMarks,
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
        onRemoveLearner={onRemoveLearner}
        onProfileClick={onProfileClick}
        onAddLearnerClick={onAddLearnerClick}
        onBatchDelete={onBatchDelete}
        onBatchComment={onBatchComment}
        onBatchClearMarks={onBatchClearMarks}
      />
    </div>
  );
};