import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Learner } from "./CreateClassDialog";
import { AlertTriangle, CheckCircle2, SearchX, TrendingUp, TrendingDown, Ruler } from "lucide-react";
import { useMemo } from "react";

interface ModerationToolsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learners: Learner[];
  classAverage: number;
}

export const ModerationToolsDialog = ({
  isOpen,
  onOpenChange,
  learners,
  classAverage,
}: ModerationToolsDialogProps) => {
  
  const analysis = useMemo(() => {
    const marks = learners
      .map(l => parseFloat(l.mark))
      .filter(m => !isNaN(m));
    
    // 1. Missing Marks
    const missing = learners.filter(l => !l.mark || l.mark.trim() === '');
    
    // 2. Invalid Marks (Outside 0-100)
    const invalid = learners.filter(l => {
        const m = parseFloat(l.mark);
        return !isNaN(m) && (m < 0 || m > 100);
    });

    // 3. Statistical Outliers (Standard Deviation)
    // Calculate Standard Deviation
    const n = marks.length;
    let outliers: { learner: Learner, type: 'high' | 'low', diff: number }[] = [];
    
    if (n > 1) {
        const mean = marks.reduce((a, b) => a + b) / n;
        const variance = marks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const sd = Math.sqrt(variance);
        
        // Define anomaly as > 2 SDs from mean
        // Only trigger if SD is significant enough (> 5%) to avoid flagging tight clusters
        if (sd > 5) {
            outliers = learners.reduce((acc, l) => {
                const m = parseFloat(l.mark);
                if (!isNaN(m)) {
                    if (m > mean + (2 * sd)) {
                        acc.push({ learner: l, type: 'high', diff: Math.round(m - mean) });
                    } else if (m < mean - (2 * sd)) {
                        acc.push({ learner: l, type: 'low', diff: Math.round(mean - m) });
                    }
                }
                return acc;
            }, [] as { learner: Learner, type: 'high' | 'low', diff: number }[]);
        }
    }

    // 4. Perfect Scores & Zeroes
    const perfects = learners.filter(l => parseFloat(l.mark) === 100);
    const zeroes = learners.filter(l => parseFloat(l.mark) === 0);

    return { missing, invalid, outliers, perfects, zeroes, total: learners.length };
  }, [learners]);

  const allGood = 
    analysis.missing.length === 0 && 
    analysis.invalid.length === 0 && 
    analysis.outliers.length === 0 &&
    analysis.zeroes.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Moderation Assistant
          </DialogTitle>
          <DialogDescription>
            Validate your class data for anomalies, potential errors, and missing entries before reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1">
            {allGood ? (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold">Data Looks Clean</h3>
                    <p className="text-muted-foreground max-w-sm">
                        No missing marks, invalid entries, or significant statistical outliers were detected.
                    </p>
                </div>
            ) : (
                <Tabs defaultValue="issues" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="issues" className="relative">
                            Data Issues
                            {(analysis.missing.length > 0 || analysis.invalid.length > 0) && (
                                <span className="absolute top-1 right-2 h-2 w-2 bg-red-500 rounded-full" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="anomalies">
                            Statistical Anomalies
                            {analysis.outliers.length > 0 && (
                                <span className="absolute top-1 right-2 h-2 w-2 bg-amber-500 rounded-full" />
                            )}
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="issues" className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-4">
                                {analysis.invalid.length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Invalid Marks Detected ({analysis.invalid.length})</AlertTitle>
                                        <AlertDescription>
                                            Marks must be between 0 and 100.
                                            <ul className="mt-2 text-xs list-disc pl-4 space-y-1">
                                                {analysis.invalid.map((l, i) => (
                                                    <li key={i}>
                                                        <span className="font-semibold">{l.name}:</span> {l.mark}
                                                    </li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {analysis.missing.length > 0 && (
                                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-100">
                                        <SearchX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        <AlertTitle>Missing Marks ({analysis.missing.length})</AlertTitle>
                                        <AlertDescription>
                                            The following learners have no recorded mark:
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {analysis.missing.map((l, i) => (
                                                    <Badge key={i} variant="outline" className="bg-white/50 dark:bg-black/20">
                                                        {l.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                {analysis.missing.length === 0 && analysis.invalid.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No data integrity issues found.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="anomalies" className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
                         <ScrollArea className="flex-1 pr-4">
                             <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    These items are not necessarily errors but deviate significantly from the class average ({classAverage}%). Double-check script marking.
                                </p>

                                {analysis.outliers.length > 0 ? (
                                    <div className="space-y-2">
                                        {analysis.outliers.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                                <div className="flex items-center gap-3">
                                                    {item.type === 'high' ? (
                                                        <div className="p-2 bg-green-100 text-green-700 rounded-full">
                                                            <TrendingUp className="h-4 w-4" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 bg-red-100 text-red-700 rounded-full">
                                                            <TrendingDown className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{item.learner.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.type === 'high' ? 'Significantly above' : 'Significantly below'} average
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold">{item.learner.mark}%</span>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.type === 'high' ? '+' : '-'}{item.diff} from avg
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No statistical outliers detected.</p>
                                    </div>
                                )}

                                {(analysis.zeroes.length > 0 || analysis.perfects.length > 0) && (
                                     <div className="mt-4 pt-4 border-t">
                                        <h4 className="text-sm font-semibold mb-2">Edge Cases</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.perfects.map((l, i) => (
                                                <Badge key={`p-${i}`} className="bg-green-600 hover:bg-green-700">
                                                    100%: {l.name}
                                                </Badge>
                                            ))}
                                            {analysis.zeroes.map((l, i) => (
                                                <Badge key={`z-${i}`} variant="destructive">
                                                    0%: {l.name}
                                                </Badge>
                                            ))}
                                        </div>
                                     </div>
                                )}
                             </div>
                         </ScrollArea>
                    </TabsContent>
                </Tabs>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};