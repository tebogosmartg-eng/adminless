import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, PlayCircle, Camera, WifiOff, Users, User } from 'lucide-react';
import { useSync } from '@/context/SyncContext';
import { ScanMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScanUploadSectionProps {
  imagePreviews: string[];
  isProcessing: boolean;
  scanMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onSimulate: () => void;
}

export const ScanUploadSection = ({
  imagePreviews,
  isProcessing,
  scanMode,
  onModeChange,
  onFileChange,
  onProcess,
  onSimulate
}: ScanUploadSectionProps) => {
  const { isOnline } = useSync();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>1. Select Mode & Upload</CardTitle>
        <CardDescription>Choose your scan type and upload images.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => onModeChange('bulk')}
                className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                    scanMode === 'bulk' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/20"
                )}
            >
                <Users className={cn("h-6 w-6", scanMode === 'bulk' ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                    <p className="text-xs font-bold">Bulk Marksheet</p>
                    <p className="text-[10px] text-muted-foreground">List of many students</p>
                </div>
            </button>
            <button 
                onClick={() => onModeChange('individual')}
                className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                    scanMode === 'individual' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/20"
                )}
            >
                <User className={cn("h-6 w-6", scanMode === 'individual' ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                    <p className="text-xs font-bold">Individual Script</p>
                    <p className="text-[10px] text-muted-foreground">1 student per set</p>
                </div>
            </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-48 p-2 border-2 border-dashed rounded-lg bg-muted/5 relative group">
          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 w-full max-h-48 overflow-y-auto p-2">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt="Preview" className="h-20 w-full object-cover rounded-md border" />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Camera className="mx-auto h-10 w-10 text-muted-foreground mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground font-medium">Capture or upload images</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
            <Input type="file" accept="image/*" onChange={onFileChange} multiple />
            
            <div className="flex flex-col gap-2">
                {!isOnline && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-100">
                    <WifiOff className="h-3.5 w-3.5" /> AI Scanning unavailable offline.
                    </div>
                )}
                
                <Button onClick={onProcess} disabled={isProcessing || imagePreviews.length === 0 || !isOnline} className="w-full h-11 font-bold">
                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><FileText className="mr-2 h-4 w-4" /> Start AI Extraction</>}
                </Button>
                
                <Button onClick={onSimulate} variant="ghost" disabled={isProcessing} className="w-full text-xs text-muted-foreground">
                    <PlayCircle className="mr-2 h-3 w-3" /> Run Simulation (Demo)
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};