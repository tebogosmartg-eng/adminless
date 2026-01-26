import { AssessmentImportDialog } from './AssessmentImportDialog';
import { AssessmentAnalyticsDialog } from './AssessmentAnalyticsDialog';
import { CopyAssessmentsDialog } from './CopyAssessmentsDialog';
import { Assessment, Learner, AssessmentMark, ClassInfo } from '@/lib/types';

interface MarkSheetDialogsProps {
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  assessments: Assessment[];
  classInfo: ClassInfo;
  handleBulkImport: (assId: string, marks: { learnerId: string; score: number }[]) => void;
  
  analyticsOpen: boolean;
  setAnalyticsOpen: (open: boolean) => void;
  selectedAssessment: Assessment | null;
  marks: AssessmentMark[];
  
  isCopyOpen: boolean;
  setIsCopyOpen: (open: boolean) => void;
  viewTermId: string | null;
  refreshAssessments: (classId: string, termId: string) => void;
}

export const MarkSheetDialogs = ({
  isImportOpen, setIsImportOpen, assessments, classInfo, handleBulkImport,
  analyticsOpen, setAnalyticsOpen, selectedAssessment, marks,
  isCopyOpen, setIsCopyOpen, viewTermId, refreshAssessments
}: MarkSheetDialogsProps) => {
  return (
    <>
      <AssessmentImportDialog 
          open={isImportOpen} 
          onOpenChange={setIsImportOpen} 
          assessments={assessments} 
          learners={classInfo.learners} 
          onImport={handleBulkImport}
       />

       <AssessmentAnalyticsDialog 
          open={analyticsOpen} 
          onOpenChange={setAnalyticsOpen} 
          assessment={selectedAssessment} 
          marks={marks} 
          learners={classInfo.learners} 
       />

       {viewTermId && (
         <CopyAssessmentsDialog
            open={isCopyOpen}
            onOpenChange={setIsCopyOpen}
            currentClassId={classInfo.id}
            currentTermId={viewTermId}
            onSuccess={() => refreshAssessments(classInfo.id, viewTermId)}
         />
       )}
    </>
  );
};