"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2, Sparkles, Copy, Check, Printer } from 'lucide-react';
import { useState } from 'react';
import { showSuccess } from '@/utils/toast';

interface RemediationWorksheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheet: string;
  isLoading: boolean;
  title: string;
}

export const RemediationWorksheetDialog = ({ open, onOpenChange, worksheet, isLoading, title }: RemediationWorksheetDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(worksheet);
    setCopied(true);
    showSuccess("Worksheet copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([worksheet], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Remediation_Worksheet_${title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Markdown worksheet downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl h-[95vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="bg-primary p-4 sm:p-6 text-primary-foreground shrink-0">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1 w-full sm:w-auto">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase tracking-widest text-[9px] font-black">AI Pedagogy Engine</Badge>
                    <DialogTitle className="text-xl sm:text-2xl font-bold truncate pr-2">Targeted Learning Bridge</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 text-xs sm:text-sm">Draft remediation material based on diagnostic root causes.</DialogDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20 flex-1 sm:flex-none border-none shadow-none h-9" onClick={handleDownload} disabled={isLoading || !worksheet}>
                        <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Download .md</span>
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20 flex-1 sm:flex-none border-none shadow-none h-9" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Print Preview</span>
                    </Button>
                </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-4 sm:p-8 bg-background">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse text-center px-4">Generating pedagogical bridge from data...</p>
                </div>
            ) : worksheet ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base">
                    <div className="whitespace-pre-wrap font-sans leading-relaxed">
                        {worksheet}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center text-muted-foreground italic text-xs sm:text-sm px-6">
                    Could not generate material. Please check your diagnostic findings.
                </div>
            )}
        </ScrollArea>

        <div className="p-3 sm:p-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground truncate pr-2">
                <Sparkles className="h-3 w-3 text-primary shrink-0" /> 
                <span className="truncate">AI Guided Instruction Draft</span>
            </div>
            <Button size="sm" variant="ghost" className="gap-1.5 sm:gap-2 h-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shrink-0" onClick={handleCopy} disabled={!worksheet}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy to Clipboard"}</span>
                <span className="sm:hidden">{copied ? "Copied" : "Copy"}</span>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};