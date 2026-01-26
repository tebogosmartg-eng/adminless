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
    classes
  } = useScanLogic();

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Scan Scripts</h1>
      <div className="grid gap-8 md:grid-cols-2 h-[calc(100vh-140px)]">
        <div className="flex flex-col">
            <ScanUploadSection 
            imagePreviews={imagePreviews}
            isProcessing={isProcessing}
            onFileChange={handleFileChange}
            onProcess={handleProcessImage}
            onSimulate={handleSimulateScan}
            />
        </div>

        <div className="flex flex-col h-full overflow-hidden">
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
            />
        </div>
      </div>
    </>
  );
};

export default Scan;