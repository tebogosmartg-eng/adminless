import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Copy, Check, Loader2, Download, ClipboardCheck } from 'lucide-react';
import { ClassInfo, ClassInsight, Learner } from '@/lib/types';
import { useState } from 'react';
import { showSuccess } from '@/utils/toast';
import { useSetupStatus } from '@/hooks/useSetupStatus';

interface AiInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classInfo: ClassInfo | undefined;
  learners: Learner[];
  insights: ClassInsight | null;
  isLoading: boolean;
  onGenerate: () => void;
  onSimulate: () => void;
}

export const AiInsightsDialog = ({
  open,
  onOpenChange,
  classInfo,
  learners,
  insights,
  isLoading,
  onGenerate,
  onSimulate
}: AiInsightsDialogProps) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { hasMarksCaptured } = useSetupStatus();

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    showSuccess(`${section} copied to clipboard!`);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownload = () => {
    if (!insights || !classInfo) return;
    
    const content = `
AI Class Analysis Report
Class: ${classInfo.className} (${classInfo.grade} ${classInfo.subject})
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
${insights.summary}

KEY STRENGTHS
${insights.strengths.map(s => `- ${s}`).join('\n')}

AREAS FOR IMPROVEMENT
${insights.areasForImprovement.map(s => `- ${s}`).join('\n')}

RECOMMENDATIONS & STRATEGIES
${insights.recommendations.map(s => `- ${s}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Insights_${classInfo.className.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Insights downloaded as text file.");
  };

  const formatListForCopy = (list: string[]) => list.map(item => `• ${item}`).join('\n');

  if (!classInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
             <div>
                <DialogTitle className="flex items-center gap-2 text-xl text-primary">
                    <Sparkles className="h-6 w-6" />
                    AI Class Analysis
                </DialogTitle>
                <DialogDescription>
                    AI-generated performance insights for {classInfo.grade} {classInfo.subject}.
                </DialogDescription>
             </div>
             {insights && (
                 <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Save
                 </Button>
             )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!insights ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="font-semibold text-lg">Generate Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze learner performance to identify trends, strengths, and areas for intervention using AI.
                </p>
              </div>

              {!hasMarksCaptured ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 max-w-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-left">
                        <p className="text-sm font-bold text-amber-900">Setup Incomplete</p>
                        <p className="text-xs text-amber-800 leading-tight">
                            AI analysis requires at least one task with captured marks to function accurately.
                        </p>
                    </div>
                  </div>
              ) : (
                <div className="flex gap-2 mt-4">
                    <Button onClick={onGenerate} disabled={isLoading} className="min-w-[140px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Analysis
                    </Button>
                    <Button variant="outline" onClick={onSimulate} disabled={isLoading}>
                        Demo Mode
                    </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="p-4 bg-muted/40 rounded-lg border relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(insights.summary, 'Summary')}>
                      {copiedSection === 'Summary' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                   </Button>
                </div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" /> Executive Summary
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{insights.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3 relative group">
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(formatListForCopy(insights.strengths), 'Strengths')}>
                        {copiedSection === 'Strengths' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                     </Button>
                  </div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-4 w-4" /> Key Strengths
                  </h4>
                  <ul className="space-y-2">
                    {insights.strengths.map((item, i) => (
                      <li key={i} className="text-sm bg-green-50 text-green-900 px-3 py-2 rounded-md border border-green-100">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 relative group">
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(formatListForCopy(insights.areasForImprovement), 'Areas')}>
                        {copiedSection === 'Areas' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                     </Button>
                  </div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" /> Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {insights.areasForImprovement.map((item, i) => (
                      <li key={i} className="text-sm bg-orange-50 text-orange-900 px-3 py-2 rounded-md border border-orange-100">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3 relative group">
                 <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(formatListForCopy(insights.recommendations), 'Recommendations')}>
                        {copiedSection === 'Recommendations' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                     </Button>
                  </div>
                <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-700">
                  <Lightbulb className="h-4 w-4" /> Recommendations & Strategies
                </h4>
                <div className="grid gap-2">
                  {insights.recommendations.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="mt-0.5 bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-blue-900">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};