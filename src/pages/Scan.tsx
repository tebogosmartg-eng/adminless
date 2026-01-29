import { useScanLogic } from '@/hooks/useScanLogic';
import { ScanUploadSection } from '@/components/scan/ScanUploadSection';
import { ScanReviewSection } from '@/components/scan/ScanReviewSection';

const Scan = () => {
  const {
    imagePreviews,
    isProcessing,
    scannedDetails,
    scannedLearners,
    selectedClassId, setSelectedClassId,
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
    setSelectedAssessmentId
  } = useScanLogic();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Scan Scripts</h1>
        <p className="text-sm text-muted-foreground">Extract marks from paper lists or scripts using AI.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:h-[calc(100vh-200px)] items-stretch">
        <div className="flex flex-col min-h-[400px]">
            <ScanUploadSection 
            imagePreviews={imagePreviews}
            isProcessing={isProcessing}
            onFileChange={handleFileChange}
            onProcess={handleProcessImage}
            onSimulate={handleSimulateScan}
            />
        </div>

        <div className="flex flex-col h-full overflow-hidden min-h-[500px] border rounded-lg bg-card">
            <ScanReviewSection 
            scannedDetails={scannedDetails}
            scannedLearners={scannedLearners}
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
            />
        </div>
      </div>
    </div>
  );
};

export default Scan;