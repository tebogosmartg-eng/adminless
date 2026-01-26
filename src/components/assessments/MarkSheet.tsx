import { ClassInfo, Learner } from '@/lib/types';
import { useMarkSheetLogic } from '@/hooks/useMarkSheetLogic';
import { MarkSheetToolbar } from './MarkSheetToolbar';
import { MarkSheetTable } from './MarkSheetTable';
import { MarkSheetDialogs } from './MarkSheetDialogs';

interface MarkSheetProps {
  classInfo: ClassInfo;
  onViewLearnerProfile?: (learner: Learner) => void;
}

export const MarkSheet = ({ classInfo, onViewLearnerProfile }: MarkSheetProps) => {
  const { state, actions } = useMarkSheetLogic(classInfo);

  if (!state.currentViewTerm) {
      return <div className="p-8 text-center text-muted-foreground">Please configure an Active Academic Year and Term in Settings.</div>;
  }

  return (
    <div className="space-y-4">
       <MarkSheetToolbar 
          terms={state.terms}
          activeTerm={state.activeTerm}
          activeYear={state.activeYear}
          viewTermId={state.viewTermId}
          setViewTermId={actions.setViewTermId}
          currentViewTerm={state.currentViewTerm}
          isWeightValid={state.isWeightValid}
          currentTotalWeight={state.currentTotalWeight}
          isLocked={state.isLocked}
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          editedMarksCount={Object.keys(state.editedMarks).length}
          handleSaveMarks={actions.handleSaveMarks}
          handleExportSheet={actions.handleExportSheet}
          isAddOpen={state.isAddOpen}
          setIsAddOpen={actions.setIsAddOpen}
          setIsImportOpen={actions.setIsImportOpen}
          setIsCopyOpen={actions.setIsCopyOpen}
          newAss={state.newAss}
          setNewAss={actions.setNewAss}
          handleAddAssessment={actions.handleAddAssessment}
          assessments={state.assessments}
          visibleAssessmentIds={state.visibleAssessmentIds}
          toggleAssessmentVisibility={actions.toggleAssessmentVisibility}
          recalculateTotal={state.recalculateTotal}
          setRecalculateTotal={actions.setRecalculateTotal}
       />

       <MarkSheetTable 
          assessments={state.assessments}
          visibleAssessments={state.visibleAssessments}
          filteredLearners={state.filteredLearners}
          currentViewTermName={state.currentViewTerm.name}
          isLocked={state.isLocked}
          isUsingVisibleTotal={state.isUsingVisibleTotal}
          atRiskThreshold={state.atRiskThreshold}
          setIsAddOpen={actions.setIsAddOpen}
          openAnalytics={actions.openAnalytics}
          deleteAssessment={actions.deleteAssessment}
          getMarkValue={actions.getMarkValue}
          handleMarkChange={actions.handleMarkChange}
          calculateLearnerTotal={actions.calculateLearnerTotal}
          getAssessmentStats={actions.getAssessmentStats}
          onViewLearnerProfile={onViewLearnerProfile}
       />

       <MarkSheetDialogs 
          isImportOpen={state.isImportOpen}
          setIsImportOpen={actions.setIsImportOpen}
          assessments={state.assessments}
          classInfo={classInfo}
          handleBulkImport={actions.handleBulkImport}
          analyticsOpen={state.analyticsOpen}
          setAnalyticsOpen={actions.setAnalyticsOpen}
          selectedAssessment={state.selectedAssessment}
          marks={state.marks}
          isCopyOpen={state.isCopyOpen}
          setIsCopyOpen={actions.setIsCopyOpen}
          viewTermId={state.viewTermId}
          refreshAssessments={actions.refreshAssessments}
       />
    </div>
  );
};