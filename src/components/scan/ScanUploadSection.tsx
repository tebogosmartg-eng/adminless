import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, PlayCircle, Camera, Users, User, ClipboardList, ShieldCheck, FileSearch, UserPlus, AlertCircle, PlusCircle } from 'lucide-react';
import { ScanType, ClassInfo, Assessment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CreateClassInlineDialog } from './CreateClassInlineDialog';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface ScanUploadSectionProps {
  imagePreviews: string[];
  isProcessing: boolean;
  scanType: ScanType;
  onTypeChange: (type: ScanType) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onSimulate: () => void;
  classes: ClassInfo[];
  selectedClassId?: string;
  onClassChange: (id: string) => void;
  availableAssessments: Assessment[];
  selectedAssessmentId?: string;
  onAssessmentChange: (id: string) => void;
  isReady: boolean;
  isCreateClassOpen: boolean;
  setIsCreateClassOpen: (open: boolean) => void;
}

export const ScanUploadSection = ({
  imagePreviews,
  isProcessing,
  scanType,
  onTypeChange,
  onFileChange,
  onProcess,
  onSimulate,
  classes,
  selectedClassId,
  onClassChange,
  availableAssessments,
  selectedAssessmentId,
  onAssessmentChange,
  isReady,
  isCreateClassOpen,
  setIsCreateClassOpen
}: ScanUploadSectionProps) => {

  const TYPE_OPTIONS = [
    { id: 'class_marksheet', label: 'Class Marksheet', sub: 'Bulk Assessment', icon: Users },
    { id: 'individual_script', label: 'Individual Script', sub: '1 student / set', icon: User },
  ];

  const needsAssessment = ['class_marksheet', 'individual_script'].includes(scanType);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>1. Context & Source</CardTitle>
        <CardDescription>Bind your scan to a specific class and task.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
            {TYPE_OPTIONS.map((opt) => (
                <button 
                    key={opt.id}
                    onClick={() => onTypeChange(opt.id as ScanType)}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 min-h-[110px]",
                        scanType === opt.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/30 hover:bg-muted/10"
                    )}
                >
                    <opt.icon className={cn("h-6 w-6", scanType === opt.id ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center space-y-0.5">
                        <p className="text-xs font-bold leading-tight">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground opacity-80">{opt.sub}</p>
                    </div>
                </button>
            ))}
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-dashed">
            <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Target Class</Label>
                <Select value={selectedClassId} onValueChange={onClassChange}>
                    <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select class..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="new" className="font-bold text-primary">
                          <div className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            <span>Create New Class</span>
                          </div>
                        </SelectItem>
                        <DropdownMenuSeparator />
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {needsAssessment && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Target Assessment Task</Label>
                    <Select value={selectedAssessmentId} onValueChange={onAssessmentChange} disabled={!selectedClassId}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new" className="font-bold text-primary">+ Create New Task from Scan</SelectItem>
                            <DropdownMenuSeparator />
                            {availableAssessments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-32 p-2 border-2 border-dashed rounded-lg bg-muted/5 relative">
          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 w-full max-h-40 overflow-y-auto p-2">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt="Preview" className="h-20 w-full object-cover rounded-md border" />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground font-medium">Upload images to begin</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Image Source</Label>
                <Input type="file" accept="image/*" onChange={onFileChange} multiple className="h-9 cursor-pointer" />
            </div>
            
            <div className="flex flex-col gap-2">
                {!isReady && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-100">
                        <AlertCircle className="h-3.5 w-3.5" /> 
                        <span>Context required: Select {needsAssessment ? 'Class & Assessment' : 'Class'} to enable AI extraction.</span>
                    </div>
                )}
                
                <Button onClick={onProcess} disabled={isProcessing || !isReady || imagePreviews.length === 0 || !navigator.onLine} className="w-full h-11 font-bold">
                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><FileText className="mr-2 h-4 w-4" /> Start AI Extraction</>}
                </Button>
                
                <Button onClick={onSimulate} variant="ghost" disabled={isProcessing || !isReady} className="w-full text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <PlayCircle className="mr-2 h-3 w-3" /> Run Simulation
                </Button>
            </div>
        </div>
      </CardContent>

      <CreateClassInlineDialog 
        open={isCreateClassOpen} 
        onOpenChange={setIsCreateClassOpen} 
        onSuccess={(id) => onClassChange(id)} 
      />
    </Card>
  );
};