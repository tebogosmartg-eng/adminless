"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReviewState } from '@/hooks/useReviewState';
import { ReviewHeader } from '@/components/teacher-file/review/ReviewHeader';
import { ReviewSidebar } from '@/components/teacher-file/review/ReviewSidebar';
import { ReviewDocument } from '@/components/teacher-file/review/ReviewDocument';
import { Loader2 } from 'lucide-react';

const TeacherFileReviewContent = ({ classId, termId }: { classId: string; termId: string }) => {
  const navigate = useNavigate();
  const { state, actions } = useReviewState(classId, termId);

  if (state.loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Compiling Review Portfolio...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <ReviewHeader 
        onBack={() => navigate(-1)}
        activeSnapshotId={state.activeSnapshotId}
        snapshots={state.snapshots}
        onClearSnapshot={() => actions.setActiveSnapshotId(null)}
        isExporting={state.isExporting}
        onExport={actions.handleExportPDF}
        className={state.currentClass?.className || ""}
        termName={state.activeTerm?.name || ""}
      />

      <div className="container mx-auto py-12 flex flex-col lg:flex-row gap-12 max-w-7xl px-8">
        <ReviewSidebar 
          search={state.search}
          onSearchChange={actions.setSearch}
          selectedSectionId={state.selectedSectionId}
          onSectionSelect={actions.setSelectedSectionId}
          sections={state.sections}
          portfolioOnly={state.portfolioOnly}
          onPortfolioOnlyChange={actions.setPortfolioOnly}
          activeSnapshotId={state.activeSnapshotId}
          onSnapshotSelect={actions.setActiveSnapshotId}
          isBuildingSnapshot={state.isBuildingSnapshot}
          onSetBuildingSnapshot={actions.setIsBuildingSnapshot}
          snapshotName={state.snapshotName}
          onSnapshotNameChange={actions.setSnapshotName}
          onSaveSnapshot={actions.handleSaveSnapshot}
          snapshots={state.snapshots}
          onDeleteSnapshot={actions.deleteSnapshot}
        />

        <main className="flex-1">
            <ReviewDocument 
                teacherName={state.teacherName}
                className={state.currentClass?.className || ""}
                grade={state.currentClass?.grade || ""}
                termName={state.activeTerm?.name || ""}
                auditStats={state.auditStats}
                sections={state.sections}
                groupedBySection={state.groupedBySection}
                allAttachments={state.allAttachments}
                collapsedSections={state.collapsedSections}
                onToggleSection={actions.toggleSection}
                loadingFileId={state.loadingFileId}
                onViewFile={actions.handleViewFile}
            />
        </main>
      </div>
    </div>
  );
};

const TeacherFileReview = () => {
  const { classId, termId } = useParams();

  if (!classId || !termId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Invalid or missing route parameters.</p>
      </div>
    );
  }

  return <TeacherFileReviewContent classId={classId} termId={termId} />;
};

export default TeacherFileReview;