import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Loader2, PlayCircle } from 'lucide-react';

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Upload Scripts</CardTitle>
        <CardDescription>Choose one or more images of scripts to scan.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center w-full min-h-64 p-2 border-2 border-dashed rounded-lg">
          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`Script preview ${index + 1}`} className="max-h-full max-w-full object-contain rounded-md" />
              ))}
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Drag & drop or click to upload</p>
            </div>
          )}
        </div>
        <Input type="file" accept="image/*" onChange={onFileChange} className="mt-4" multiple />
        
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onProcess} disabled={isProcessing || imagePreviews.length === 0} className="w-full">
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
          Tip: Use "Simulate" to test functionality quickly.
        </p>
      </CardContent>
    </Card>
  );
};