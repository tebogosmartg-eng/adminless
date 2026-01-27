import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Loader2, PlayCircle, Camera, WifiOff } from 'lucide-react';
import { useSync } from '@/context/SyncContext';

interface ScanUploadSectionProps {
  imagePreviews: string[];
  isProcessing: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onSimulate: () => void;
}

export const ScanUploadSection = ({
  imagePreviews,
  isProcessing,
  onFileChange,
  onProcess,
  onSimulate
}: ScanUploadSectionProps) => {
  const { isOnline } = useSync();

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Upload Scripts or Lists</CardTitle>
        <CardDescription>Upload images of mark sheets, tests, or class lists.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center w-full min-h-64 p-2 border-2 border-dashed rounded-lg bg-muted/5">
          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 w-full">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`Script preview ${index + 1}`} className="max-h-40 w-full object-cover rounded-md border" />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Take a photo</h3>
              <p className="text-sm text-muted-foreground mb-4">or select images from your device</p>
            </div>
          )}
        </div>
        
        <Input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange} 
            className="mt-4" 
            multiple 
            // @ts-ignore
            capture="environment"
        />
        
        <div className="flex flex-col gap-2 mt-4">
          {!isOnline && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
               <WifiOff className="h-4 w-4" />
               AI Scanning is unavailable while offline.
            </div>
          )}
          
          <Button onClick={onProcess} disabled={isProcessing || imagePreviews.length === 0 || !isOnline} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing with Gemini AI...
              </>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Process Images</>
            )}
          </Button>
          
          <Button onClick={onSimulate} variant="outline" disabled={isProcessing} className="w-full">
            <PlayCircle className="mr-2 h-4 w-4" /> Simulate Scan (Demo Mode)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Tip: Ensure the list/script is well-lit and text is legible.
        </p>
      </CardContent>
    </Card>
  );
};