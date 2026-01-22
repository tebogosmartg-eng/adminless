import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassInsight } from "@/services/gemini";
import { BrainCircuit, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AiInsightsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isLoading: boolean;
  insights: ClassInsight | null;
  onGenerate: () => void;
}

export const AiInsightsDialog = ({ isOpen, onOpenChange, isLoading, insights, onGenerate }: AiInsightsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Class Insights
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis of your class performance and recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Analyzing marks and generating insights...</p>
            </div>
          ) : !insights ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <BrainCircuit className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground max-w-xs">
                Click the button below to generate a detailed analysis of this class's performance.
              </p>
              <Button onClick={onGenerate}>Generate Insights</Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 font-semibold mb-3 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {insights.strengths.map((item, index) => (
                      <li key={index} className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-100 dark:border-green-900/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 font-semibold mb-3 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {insights.weaknesses.map((item, index) => (
                      <li key={index} className="text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 font-semibold mb-3 text-blue-600 dark:text-blue-400">
                    <Lightbulb className="h-4 w-4" /> Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((item, index) => (
                      <li key={index} className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};