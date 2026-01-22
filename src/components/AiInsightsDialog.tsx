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
import { BrainCircuit, CheckCircle2, AlertTriangle, Lightbulb, PlayCircle, Copy } from "lucide-react";
import { Loader2 } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface AiInsightsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isLoading: boolean;
  insights: ClassInsight | null;
  onGenerate: () => void;
  onSimulate: () => void;
}

export const AiInsightsDialog = ({ isOpen, onOpenChange, isLoading, insights, onGenerate, onSimulate }: AiInsightsDialogProps) => {
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to clipboard!");
  };

  const handleCopyList = (items: string[]) => {
    navigator.clipboard.writeText(items.map(i => `• ${i}`).join('\n'));
    showSuccess("List copied to clipboard!");
  };

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
              <div className="flex gap-2">
                <Button onClick={onGenerate}>Generate Insights</Button>
                <Button variant="outline" onClick={onSimulate}>
                  <PlayCircle className="mr-2 h-4 w-4" /> Demo Mode
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border group relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Summary</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(insights.summary)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                <div className="group relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Strengths
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyList(insights.strengths)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {insights.strengths.map((item, index) => (
                      <li key={index} className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-100 dark:border-green-900/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="group relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" /> Areas for Improvement
                    </h3>
                     <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyList(insights.weaknesses)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {insights.weaknesses.map((item, index) => (
                      <li key={index} className="text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="group relative">
                   <div className="flex justify-between items-center mb-3">
                    <h3 className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                      <Lightbulb className="h-4 w-4" /> Recommendations
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyList(insights.recommendations)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
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