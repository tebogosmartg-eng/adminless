"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground shrink-0">
          <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase tracking-widest text-[9px] font-black">AI Pedagogy Engine</Badge>
                    <DialogTitle className="text-2xl font-bold">Targeted Learning Bridge</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80">Draft remediation material based on diagnostic root causes.</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={handleDownload} disabled={isLoading || !worksheet}>
                        <Download className="h-4 w-4 mr-2" /> Download .md
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" /> Print Preview
                    </Button>
                </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-8 bg-background">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Generating pedagogical bridge from data...</p>
                </div>
            ) : worksheet ? (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {worksheet}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center text-muted-foreground italic">
                    Could not generate material. Please check your diagnostic findings.
                </div>
            )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> 
                AI Guided Instruction Draft
            </div>
            <Button size="sm" variant="ghost" className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy to Clipboard"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { Badge } from '@/components/ui/badge';