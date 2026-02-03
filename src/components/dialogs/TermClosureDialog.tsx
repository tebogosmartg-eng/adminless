import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Lock, XCircle, ShieldAlert, FileWarning } from 'lucide-react';
import { ValidationError } from '@/hooks/useTermValidation';
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValid ? (
               <Lock className="h-5 w-5 text-green-600" /> 
            ) : (
               <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            {isValid ? `Finalize ${termName}?` : `Compliance Issues: ${termName}`}
          </DialogTitle>
          <DialogDescription>
            {isValid 
              ? "All validation checks passed. Closing this term will lock all marks and finalize the audit trail."
              : "The following departmental requirements must be met before this term can be finalized."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[350px] mt-4">
          {isValid ? (
            <div className="flex flex-col items-center justify-center py-6 text-green-600 space-y-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-12 w-12" />
                <p className="font-medium">Ready to Finalize</p>
            </div>
          ) : (
            <div className="space-y-3">
                {errors.map((err, idx) => (
                    <div key={idx} className={cn(
                        "flex items-start gap-3 p-3 border rounded-lg",
                        err.type === 'sample' ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-100"
                    )}>
                        {err.type === 'sample' ? (
                            <FileWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        ) : err.type === 'weight' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className={cn(
                                "font-semibold text-sm",
                                err.type === 'sample' ? "text-amber-900" : "text-red-900"
                            )}>{err.className} • {err.subject}</p>
                            <p className={cn(
                                "text-sm",
                                err.type === 'sample' ? "text-amber-700" : "text-red-700"
                            )}>{err.details}</p>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onConfirm} 
            disabled={!isValid} 
            variant={isValid ? "default" : "secondary"}
            className={isValid ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isValid ? "Confirm & Close Term" : "Resolve Red Flags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};