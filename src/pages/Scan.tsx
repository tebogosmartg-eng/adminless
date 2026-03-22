import { useScanLogic } from '@/hooks/useScanLogic';
import { ScanUploadSection } from '@/components/scan/ScanUploadSection';
import { ScanReviewSection } from '@/components/scan/ScanReviewSection';
import { ControlledReplacementDialog } from '@/components/scan/ControlledReplacementDialog';

const Scan = ({ embedded = false, defaultClassId }: { embedded?: boolean, defaultClassId?: string }) => {
  const {
    scanType, setScanType,
    imagePreviews,
    isProcessing,
    scannedDetails,
    scannedLearners,
    learnerMappings,
    updateLearnerMapping,
    selectedClassId, setSelectedClassId, handleClassChange,
    newClassName, setNewClassName,
    activeTab, setActiveTab,
    handleFileChange,
    handleProcessImage,
    handleSimulateScan,
    updateScannedDetail,
    updateScannedLearner,
    handleSaveToExisting,
    handleCreateNewClass,
    classes,
    availableAssessments,
    selectedAssessmentId,
    setSelectedAssessmentId,
    isExtractionReady,
    isConflictOpen, setIsConflictOpen, existingMarks, applyScannedData, targetClass, targetAssessment,
    isCreateClassOpen, setIsCreateClassOpen
  } = useScanLogic(defaultClassId);

  return (
    <div className={`flex flex-col gap-6 max-w-7xl mx-auto ${embedded ? 'pb-2' : 'pb-10'}`}>
      {!embedded && (
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Scan Scripts</h1>
          <p className="text-sm text-muted-foreground">Automated mark extraction bound to specific academic context.</p>
        </div>
      )}

      <div className={`grid gap-6 md:grid-cols-2 ${embedded ? 'min-h-[600px] lg:h-[700px]' : 'lg:h-[calc(100vh-220px)]'} items-start`}>
        <div className="flex flex-col h-full">
            <ScanUploadSection 
              imagePreviews={imagePreviews}
              isProcessing={isProcessing}
              scanType={scanType}
              onTypeChange={setScanType}
              onFileChange={handleFileChange}
              onProcess={handleProcessImage}
              onSimulate={handleSimulateScan}
              classes={classes}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              availableAssessments={availableAssessments}
              selectedAssessmentId={selectedAssessmentId}
              onAssessmentChange={setSelectedAssessmentId}
              isReady={isExtractionReady}
              isCreateClassOpen={isCreateClassOpen}
              setIsCreateClassOpen={setIsCreateClassOpen}
            />
        </div>

        <div className="flex flex-col h-full overflow-hidden border rounded-lg bg-card shadow-sm">
            <ScanReviewSection 
              scannedDetails={scannedDetails}
              scannedLearners={scannedLearners}
              learnerMappings={learnerMappings}
              updateLearnerMapping={updateLearnerMapping}
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              newClassName={newClassName}
              setNewClassName={setNewClassName}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onDetailsChange={updateScannedDetail}
              onLearnerChange={updateScannedLearner}
              onSaveToExisting={handleSaveToExisting}
              onCreateNew={handleCreateNewClass}
              imagePreviews={imagePreviews}
              availableAssessments={availableAssessments}
              selectedAssessmentId={selectedAssessmentId}
              setSelectedAssessmentId={setSelectedAssessmentId}
              scanType={scanType}
            />
        </div>
      </div>

      {isConflictOpen && selectedAssessmentId && (
          <ControlledReplacementDialog 
            open={isConflictOpen}
            onOpenChange={setIsConflictOpen}
            existingMarks={existingMarks}
            scannedLearners={scannedLearners}
            learnerMappings={learnerMappings}
            targetClass={targetClass}
            targetAssessment={targetAssessment}
            assessmentId={selectedAssessmentId}
            onConfirm={applyScannedData}
          />
      )}
    </div>
  );
};

export default Scan;