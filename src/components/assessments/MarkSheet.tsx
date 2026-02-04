import { ClassInfo, Learner } from '@/lib/types';
import { useMarkSheetLogic } from '@/hooks/useMarkSheetLogic';
import { MarkSheetToolbar } from './MarkSheetToolbar';
import { MarkSheetTable } from './MarkSheetTable';
import { MarkSheetDialogs } from './MarkSheetDialogs';
import { EditAssessmentDialog } from './EditAssessmentDialog';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { RapidEntryDialog } from '@/components/dialogs/RapidEntryDialog';
import { VoiceEntryDialog } from '@/components/dialogs/VoiceEntryDialog';
import { RubricMarkingDialog } from './RubricMarkingDialog';
import { useMemo } from 'react';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';

interface MarkSheetProps {
  classInfo: ClassInfo;
  onViewLearnerProfile?: (learner: Learner) => void;
}

export const MarkSheet = ({ classInfo, onViewLearnerProfile }: MarkSheetProps) => {
  const { state, actions } = useMarkSheetLogic(classInfo);

  // Use the robust integrity utility for the current context
  const integrityReport = useMemo(() => {
    if (state.assessments.length === 0) return null;
    return checkClassTermIntegrity(state.assessments, classInfo.learners, state.marks);
  }, [state.assessments, classInfo.learners, state.marks]);

  const handleProfileClick = (learner: Learner) => {
      if (!onViewLearnerProfile) return;
      if (learner.id) {
          const calculatedTotal = actions.calculateLearnerTotal(learner.id);
          onViewLearnerProfile({
              ...learner,
              mark: calculatedTotal
          });
      } else {
          onViewLearnerProfile(learner);
      }
  };

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

  const currentMark = state.marks.find(m => 
    m.assessment_id === state.rubricMarking.assessmentId && 
    m.learner_id === state.rubricMarking.learner?.id
  );

  const currentIndex = state.filteredLearners.findIndex(l => l.id === state.rubricMarking.learner?.id);

  return (
    <div className="space-y-4">
       {/* Detailed Data Health Status */}
       {integrityReport && (
           <div className="bg-muted/20 border rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
               <div className="flex items-center gap-2 mb-3">
                   <ShieldCheck className="h-4 w-4 text-primary" />
                   <h3 className="text-xs font-bold uppercase tracking-widest">Mark Sheet Integrity</h3>
               </div>
               <IntegrityGuard report={integrityReport} />
           </div>
       )}

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
          isAutoSaving={state.isAutoSaving}
          availableRubrics={state.availableRubrics}
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
          onEditAssessment={(ass) => {
            actions.setEditingAssessment(ass);
            actions.setIsEditOpen(true);
          }}
          getMarkValue={actions.getMarkValue}
          getMarkComment={(a, l) => actions.getMarkComment(a, l)}
          handleMarkChange={actions.handleMarkChange}
          handleCommentChange={actions.handleCommentChange}
          handleBulkColumnUpdate={actions.handleBulkColumnUpdate}
          calculateLearnerTotal={actions.calculateLearnerTotal}
          getAssessmentStats={actions.getAssessmentStats}
          onViewLearnerProfile={handleProfileClick}
          onSort={actions.handleSort}
          onOpenTool={actions.openTool}
          onOpenRubric={actions.openRubricForLearner}
          validateAndCommitMark={actions.validateAndCommitMark}
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

       <EditAssessmentDialog
          open={state.isEditOpen}
          onOpenChange={actions.setIsEditOpen}
          assessment={state.editingAssessment}
          onSave={actions.handleUpdateAssessment}
          availableRubrics={state.availableRubrics}
       />

       {state.activeTool.type === 'rapid' && (
           <RapidEntryDialog 
              open={state.activeTool.type === 'rapid'}
              onOpenChange={() => actions.closeTool()}
              learners={state.learnersForTools}
              onUpdateMark={actions.handleToolUpdate}
              maxMark={state.activeAssessmentMax}
           />
       )}

       {state.activeTool.type === 'voice' && (
           <VoiceEntryDialog 
              open={state.activeTool.type === 'voice'}
              onOpenChange={() => actions.closeTool()}
              learners={state.learnersForTools}
              onUpdateMark={actions.handleToolUpdate}
              maxMark={state.activeAssessmentMax}
           />
       )}

       {state.rubricMarking.open && state.rubricMarking.rubric && state.rubricMarking.learner && (
           <RubricMarkingDialog 
                open={state.rubricMarking.open}
                onOpenChange={actions.setRubricMarkingOpen}
                rubric={state.rubricMarking.rubric}
                learner={state.rubricMarking.learner}
                initialSelections={currentMark?.rubric_selections}
                onSave={actions.handleRubricSave}
                onNext={currentIndex < state.filteredLearners.length - 1 ? actions.handleNextRubric : undefined}
                onPrev={currentIndex > 0 ? actions.handlePrevRubric : undefined}
           />
       )}
    </div>
  );
};