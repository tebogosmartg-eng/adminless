"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Learner } from '@/lib/types';
import { showSuccess, showError } from '@/utils/toast';
import { Camera, FileUp, Eraser, HelpCircle, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseMarkInput } from '@/utils/marks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImportMarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (learners: Learner[]) => void;
}

export const ImportMarksDialog = ({ open, onOpenChange, onImport }: ImportMarksDialogProps) => {
  const [text, setText] = useState('');
  const navigate = useNavigate();
  const { classId } = useParams();

  const handleImport = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      showError("Please paste some data first.");
      return;
    }

    // Split into lines and filter out empty ones
    const lines = trimmedText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    const imported: Learner[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Detect separator: comma, tab, or semicolon
      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(';')) parts = line.split(';');
      else if (line.includes(',')) parts = line.split(',');
      else parts = [line]; // Just a name

      const name = parts[0]?.trim();
      
      if (!name) {
        errors.push(`Line ${index + 1}: Name is missing.`);
        return;
      }

      let mark = "";
      if (parts.length > 1) {
        const rawMark = parts[1].trim();
        // Use the smart parsing utility to handle fractions like 15/20
        const parsed = parseMarkInput(rawMark);
        mark = parsed.value;
      }
      
      imported.push({ name, mark });
    });

    if (imported.length > 0) {
      onImport(imported);
      
      const successMsg = `Successfully imported ${imported.length} learner(s).`;
      const errorMsg = errors.length > 0 ? ` Skipped ${errors.length} invalid lines.` : "";
      
      showSuccess(successMsg + errorMsg);
      if (errors.length > 0) console.warn("Import issues:", errors);
      
      setText('');
      onOpenChange(false);
    } else {
      showError("No valid data found to import.");
    }
  };

  const handleScanNavigate = () => {
    onOpenChange(false);
    navigate("/scan", { state: { classId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                Bulk Import Learners
            </DialogTitle>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-[10px]">
                        <p className="font-bold mb-1">Supported Formats:</p>
                        <ul className="list-disc pl-3 space-y-1">
                            <li>Name Only</li>
                            <li>Name, Mark</li>
                            <li>Name, Score/Total</li>
                        </ul>
                        <p className="mt-2 text-muted-foreground">Works with CSV, Tab, or Semicolon separated lists.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            Paste your list below to automatically populate your class roster.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="relative group">
              <Textarea 
                placeholder="John Doe, 85&#10;Jane Smith, 17/20&#10;Peter Pan" 
                className="min-h-[250px] font-mono text-sm p-4 bg-muted/20 focus:bg-background transition-all resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {text && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setText('')}
                    title="Clear"
                  >
                    <Eraser className="h-4 w-4 text-muted-foreground" />
                  </Button>
              )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
             <Info className="h-4 w-4 shrink-0" />
             <p className="text-[10px] leading-tight font-medium">
                <strong>Pro Tip:</strong> You can copy and paste directly from Excel or Google Sheets. The system handles tabs and smart fraction calculation.
             </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
            <Button variant="outline" onClick={handleScanNavigate} className="gap-2">
                <Camera className="h-4 w-4" /> Scan from Camera (AI)
            </Button>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!text.trim()} className="font-bold">
                    Process & Import
                </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};