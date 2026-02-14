import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, PlayCircle, Camera, WifiOff, Users, User, ClipboardList, ShieldCheck, FileSearch, UserPlus } from 'lucide-react';
import { useSync } from '@/context/SyncContext';
import { ScanType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScanUploadSectionProps {
  imagePreviews: string[];
  isProcessing: boolean;
  scanType: ScanType;
  onTypeChange: (type: ScanType) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onSimulate: () => void;
}

export const ScanUploadSection = ({
  imagePreviews,
  isProcessing,
  scanType,
  onTypeChange,
  onFileChange,
  onProcess,
  onSimulate
}: ScanUploadSectionProps) => {
  const { isOnline } = useSync();

  const TYPE_OPTIONS = [
    { id: 'class_marksheet', label: 'Class Marksheet', sub: 'Bulk Assessment', icon: Users },
    { id: 'individual_script', label: 'Individual Script', sub: '1 student / set', icon: User },
    { id: 'learner_roster', label: 'Learner Roster', sub: 'Class Names List', icon: UserPlus },
    { id: 'attendance_register', label: 'Attendance', sub: 'Daily Register', icon: ClipboardList },
    { id: 'diagnostic_form', label: 'Diagnostic Form', sub: 'Question Analysis', icon: FileSearch },
    { id: 'moderation_sample', label: 'Moderation Sample', sub: 'Departmental Audit', icon: ShieldCheck },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>1. Document Selection</CardTitle>
        <CardDescription>What type of document are you scanning?</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
            {TYPE_OPTIONS.map((opt) => (
                <button 
                    key={opt.id}
                    onClick={() => onTypeChange(opt.id as ScanType)}
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 min-h-[90px]",
                        scanType === opt.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/20"
                    )}
                >
                    <opt.icon className={cn("h-5 w-5", scanType === opt.id ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                        <p className="text-[11px] font-bold leading-tight">{opt.label}</p>
                        <p className="text-[9px] text-muted-foreground opacity-70">{opt.sub}</p>
                    </div>
                </button>
            ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-40 p-2 border-2 border-dashed rounded-lg bg-muted/5 relative">
          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 w-full max-h-48 overflow-y-auto p-2">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt="Preview" className="h-20 w-full object-cover rounded-md border" />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground font-medium">Capture or upload images</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Image Source</Label>
                <Input type="file" accept="image/*" onChange={onFileChange} multiple className="h-9 cursor-pointer" />
            </div>
            
            <div className="flex flex-col gap-2">
                {!isOnline && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-100">
                    <WifiOff className="h-3.5 w-3.5" /> AI Scanning requires a connection.
                    </div>
                )}
                
                <Button onClick={onProcess} disabled={isProcessing || imagePreviews.length === 0 || !isOnline} className="w-full h-11 font-bold">
                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><FileText className="mr-2 h-4 w-4" /> Start AI Extraction</>}
                </Button>
                
                <Button onClick={onSimulate} variant="ghost" disabled={isProcessing} className="w-full text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <PlayCircle className="mr-2 h-3 w-3" /> Run Simulation (Demo)
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};