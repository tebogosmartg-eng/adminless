"use client";

import { ClassInfo, Learner, QuestionMark, Assessment } from '@/lib/types';
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
import { QuestionMarkingDialog } from './QuestionMarkingDialog';
import { QuestionDiagnosticDialog } from './QuestionDiagnosticDialog';
import { QuestionGridDialog } from './QuestionGridDialog';
import { useMemo, useState } from 'react';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';

interface MarkSheetProps {
  classInfo: ClassInfo;
  onViewLearnerProfile?: (learner: Learner) => void;
}

export const MarkSheet = ({ classInfo, onViewLearnerProfile }: MarkSheetProps) => {
  const { state, actions } = useMarkSheetLogic(classInfo);

  // Question marking & diagnostic state
  const [qMarking, setQMarking] = useState<{
    open: boolean;
    assessmentId: string | null;
    learner: Learner | null;
  }>({ open: false, assessmentId: null, learner: null });

  const [qGrid, setQGrid] = useState<{
    open: boolean;
    assessmentId: string | null;
  }>({ open: false, assessmentId: null });

  const [qDiagnostic, setQDiagnostic] = useState<{
      open: boolean;
      assessment: Assessment | null;
  }>({ open: false, assessment: null });

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

  const handleOpenQuestions = (assId: string, learner: Learner) => {
    setQMarking({ open: true, assessmentId: assId, learner });
  };

  const handleOpenQuestionGrid = (assId: string) => {
    setQGrid({ open: true, assessmentId: assId });
  };

  const handleQuestionSave = async (score: number, questionMarks: QuestionMark[]) => {
    if (qMarking.assessmentId && qMarking.learner?.id) {
        await actions.updateMarks([{
            assessment_id: qMarking.assessmentId,
            learner_id: qMarking.learner.id,
            score,
            question_marks: questionMarks
        } as any]);
    }
  };

  const handleGridSave = async (updates: any[]) => {
      await actions.updateMarks(updates);
  };

  const handleOpenDiagnostic = (ass: Assessment) => {
      setQDiagnostic({ open: true, assessment: ass });
  };

  const handleNextQ = () => {
    const idx = state.filteredLearners.findIndex(l => l.id === qMarking.learner?.id);
    if (idx < state.filteredLearners.length - 1) {
        setQMarking(prev => ({ ...prev, learner: state.filteredLearners[idx + 1] }));
    } else {
        setQMarking({ open: false, assessmentId: null, learner: null });
    }
  };

  const handlePrevQ = () => {
    const idx = state.filteredLearners.findIndex(l => l.id === qMarking.learner?.id);
    if (idx > 0) {
        setQMarking(prev => ({ ...prev, learner: state.filteredLearners[idx - 1] }));
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

  const currentQMark = state.marks.find(m => 
    m.assessment_id === qMarking.assessmentId && 
    m.learner_id === qMarking.learner?.id
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
          classInfo={classInfo}
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
          openAnalytics={(ass) => actions.openAnalytics(ass)}
          onOpenDiagnostic={handleOpenDiagnostic}
          onOpenQuestionGrid={handleOpenQuestionGrid}
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
          onOpenQuestions={handleOpenQuestions}
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

       {qGrid.open && qGrid.assessmentId && (
           <QuestionGridDialog
              open={qGrid.open}
              onOpenChange={(open) => setQGrid(prev => ({ ...prev, open }))}
              assessment={state.assessments.find(a => a.id === qGrid.assessmentId)!}
              learners={state.filteredLearners}
              existingMarks={state.marks}
              onSave={handleGridSave}
              isLocked={state.isLocked}
           />
       )}

       {qMarking.open && qMarking.learner && qMarking.assessmentId && (
           <QuestionMarkingDialog 
              open={qMarking.open}
              onOpenChange={(open) => setQMarking(prev => ({ ...prev, open }))}
              assessment={state.assessments.find(a => a.id === qMarking.assessmentId)!}
              learner={qMarking.learner}
              onSave={handleQuestionSave}
              initialMarks={currentQMark?.question_marks}
              onNext={handleNextQ}
              onPrev={handlePrevQ}
              isLocked={state.isLocked}
           />
       )}

       {qDiagnostic.open && qDiagnostic.assessment && (
           <QuestionDiagnosticDialog 
                open={qDiagnostic.open}
                onOpenChange={(open) => setQDiagnostic(prev => ({ ...prev, open }))}
                assessment={qDiagnostic.assessment}
                learners={state.filteredLearners}
           />
       )}
    </div>
  );
};