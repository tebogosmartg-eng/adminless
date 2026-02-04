import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Lock, XCircle, ShieldAlert, FileWarning, ClipboardCheck } from 'lucide-react';
import { ValidationError } from '@/hooks/useTermValidation';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { cn } from '@/lib/utils';

interface TermClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termName: string;
  errors: ValidationError[];
  onConfirm: () => void;
  isValid: boolean;
}

export const TermClosureDialog = ({ open, onOpenChange, termName, errors, onConfirm, isValid }: TermClosureDialogProps) => {
  const { missingRequired, isReadyForFinalization } = useSetupStatus();
  
  // A term can only be closed if standard validation passes AND the setup checklist is finished
  const canClose = isValid && isReadyForFinalization;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canClose ? (
               <Lock className="h-5 w-5 text-green-600" /> 
            ) : (
               <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            {canClose ? `Finalize ${termName}?` : `Closure Blocked: ${termName}`}
          </DialogTitle>
          <DialogDescription>
            {canClose 
              ? "All setup steps and validation checks passed. Closing this term will lock all marks."
              : "You cannot finalize this term yet. Please resolve the following requirements."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[350px] mt-4 pr-2">
          <div className="space-y-4">
            {/* Checklist Guardrail */}
            {!isReadyForFinalization && (
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ClipboardCheck className="h-3 w-3" /> Setup Checklist Incomplete
                    </h4>
                    <div className="grid gap-2">
                        {missingRequired.map(step => (
                            <div key={step.id} className="flex items-center gap-2 p-2 rounded border bg-amber-50/50 border-amber-200 text-xs text-amber-800">
                                <XCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span>{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Existing Database Validation Errors */}
            {errors.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ShieldAlert className="h-3 w-3" /> Data Integrity Errors
                    </h4>
                    <div className="space-y-3">
                        {errors.map((err, idx) => (
                            <div key={idx} className={cn(
                                "flex items-start gap-3 p-3 border rounded-lg",
                                err.type === 'sample' ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-100"
                            )}>
                                {err.type === 'sample' ? (
                                    <FileWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-semibold text-sm">{err.className}</p>
                                    <p className="text-xs opacity-80">{err.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {canClose && (
                <div className="flex flex-col items-center justify-center py-10 text-green-600 space-y-2 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle className="h-12 w-12" />
                    <p className="font-bold">Ready to Finalize</p>
                    <p className="text-xs text-center px-6">Your data is setup, validated, and ready for departmental audit.</p>
                </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onConfirm} 
            disabled={!canClose} 
            variant={canClose ? "default" : "secondary"}
            className={canClose ? "bg-green-600 hover:bg-green-700 font-bold" : ""}
          >
            {canClose ? "Confirm & Finalize Term" : "Resolve Issues First"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};