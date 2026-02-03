import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldAlert, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface IntegrityGuardProps {
  report: {
    isValid: boolean;
    score: number;
    errors: string[];
    warnings: string[];
  };
  compact?: boolean;
}

export const IntegrityGuard = ({ report, compact = false }: IntegrityGuardProps) => {
  if (report.score === 100 && report.errors.length === 0 && report.warnings.length === 0) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Data Integrity Verified</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter",
        report.isValid ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
      )}>
        {report.isValid ? <AlertCircle className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
        {report.errors.length > 0 ? "Data Critical" : "Data Warning"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Dataset Health Score</span>
        <span className={cn("text-xs font-bold", report.score < 50 ? "text-red-600" : "text-amber-600")}>{report.score}%</span>
      </div>
      <Progress value={report.score} className="h-1.5" />
      
      <div className="grid gap-2 mt-4">
        {report.errors.map((err, i) => (
          <Alert key={i} variant="destructive" className="py-2">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">CRITICAL ERROR</AlertTitle>
            <AlertDescription className="text-xs">{err}</AlertDescription>
          </Alert>
        ))}
        {report.warnings.map((warn, i) => (
          <Alert key={i} className="py-2 border-amber-200 bg-amber-50 text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-xs font-bold">WARNING</AlertTitle>
            <AlertDescription className="text-xs">{warn}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
};