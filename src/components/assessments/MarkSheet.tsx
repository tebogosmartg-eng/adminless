import { ClassInfo, Learner } from '@/lib/types';
import { useMarkSheetLogic } from '@/hooks/useMarkSheetLogic';
import { MarkSheetToolbar } from './MarkSheetToolbar';
import { MarkSheetTable } from './MarkSheetTable';
import { MarkSheetDialogs } from './MarkSheetDialogs';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { RapidEntryDialog } from '@/components/dialogs/RapidEntryDialog';
import { VoiceEntryDialog } from '@/components/dialogs/VoiceEntryDialog';

interface MarkSheetProps {
  classInfo: ClassInfo;
  onViewLearnerProfile?: (learner: Learner) => void;
}

export const MarkSheet = ({ classInfo, onViewLearnerProfile }: MarkSheetProps) => {
  const { state, actions } = useMarkSheetLogic(classInfo);

  if (!state.currentViewTerm) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/10 border rounded-lg border-dashed">
            <CalendarClock className="h-10 w-10 mb-2 opacity-50" />
            <h3 className="font-semibold mb-1">Academic Calendar Not Configured</h3>
            <p className="text-sm max-w-sm mb-4">You need to set up an Academic Year and Terms before capturing marks.</p>
            <Button variant="outline" asChild>
                <Link to="/settings">Go to Settings</Link>
            </Button>
        </div>
      );
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
          editedMarksCount={Object.keys(state.editedMarks).length + Object.keys(state.editedComments).length}
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
          sortConfig={state.sortConfig}
          setIsAddOpen={actions.setIsAddOpen}
          openAnalytics={actions.openAnalytics}
          deleteAssessment={actions.deleteAssessment}
          getMarkValue={actions.getMarkValue}
          getMarkComment={actions.getMarkComment}
          handleMarkChange={actions.handleMarkChange}
          handleCommentChange={actions.handleCommentChange}
          handleBulkColumnUpdate={actions.handleBulkColumnUpdate}
          calculateLearnerTotal={actions.calculateLearnerTotal}
          getAssessmentStats={actions.getAssessmentStats}
          onViewLearnerProfile={onViewLearnerProfile}
          onSort={actions.handleSort}
          onOpenTool={actions.openTool}
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

       {state.activeTool.type === 'rapid' && (
           <RapidEntryDialog 
              open={state.activeTool.type === 'rapid'}
              onOpenChange={() => actions.closeTool()}
              learners={state.learnersForTools}
              onUpdateMark={actions.handleToolUpdate}
           />
       )}

       {state.activeTool.type === 'voice' && (
           <VoiceEntryDialog 
              open={state.activeTool.type === 'voice'}
              onOpenChange={() => actions.closeTool()}
              learners={state.learnersForTools}
              onUpdateMark={actions.handleToolUpdate}
           />
       )}
    </div>
  );
};