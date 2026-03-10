"use client";

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssessmentQuestion, CognitiveLevel } from '@/lib/types';
import { Upload, FileSpreadsheet, Trash2, AlertCircle, HelpCircle } from 'lucide-react';
import Papa from 'papaparse';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicCombobox } from "./TopicCombobox";
import { useTopicSuggestions } from "@/hooks/useTopicSuggestions";
import { normalizeTopic } from '@/utils/topic';

interface ParsedRow {
  id: string;
  question_number: string;
  skill_description: string;
  topic: string;
  cognitive_level: CognitiveLevel;
  max_mark: string;
  isValid: boolean;
  errors: string[];
}

const mapCogLevel = (val?: string): CognitiveLevel => {
  if(!val) return 'unknown';
  const v = String(val).toLowerCase();
  if(v.includes('know') || v === 'k') return 'knowledge';
  if(v.includes('comp') || v.includes('under') || v === 'c') return 'comprehension';
  if(v.includes('app') || v === 'ap') return 'application';
  if(v.includes('anal') || v === 'an') return 'analysis';
  if(v.includes('eval') || v === 'e') return 'evaluation';
  if(v.includes('creat') || v.includes('synth') || v === 'cr') return 'creation';
  return 'unknown';
};

const processRowValues = (q: any, skill: any, topic: any, cog: any, max: any): ParsedRow => {
    const qStr = String(q || '').trim();
    const maxStr = String(max || '').trim();
    const maxNum = parseFloat(maxStr);
    
    const errors = [];
    if (!qStr) errors.push("Missing Question Label");
    if (!maxStr || isNaN(maxNum) || maxNum <= 0) errors.push("Invalid Max Mark");
    
    return {
        id: crypto.randomUUID(),
        question_number: qStr,
        skill_description: String(skill || '').trim() || 'Standard Question',
        topic: normalizeTopic(String(topic || '').trim()), // Automatically normalize on import
        cognitive_level: mapCogLevel(cog),
        max_mark: maxStr,
        isValid: errors.length === 0,
        errors
    };
};

interface BulkQuestionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: AssessmentQuestion[], mode: 'append' | 'replace') => void;
  existingQuestions?: AssessmentQuestion[];
}

export const BulkQuestionImportDialog = ({ open, onOpenChange, onImport, existingQuestions }: BulkQuestionImportDialogProps) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [text, setText] = useState('');
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Since we are in an abstracted dialog, we get the global topic dictionary
  const topicSuggestions = useTopicSuggestions();

  const reset = () => {
      setStep('input');
      setText('');
      setPreviewData([]);
      setImportMode('append');
  };

  const handleParse = (csvText: string) => {
    if (!csvText.trim()) {
        showError("Please provide some data to parse.");
        return;
    }
    
    const delimiter = csvText.includes('\t') ? '\t' : ',';
    
    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        complete: (results) => {
            const fields = results.meta.fields || [];
            let qField, skillField, topicField, cogField, maxField;
            
            fields.forEach(f => {
                const norm = f.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!qField && ['question', 'num', 'qno', 'q', 'label'].some(v => norm.includes(v))) qField = f;
                else if (!maxField && ['mark', 'max', 'total', 'score', 'points'].some(v => norm.includes(v))) maxField = f;
                else if (!skillField && ['skill', 'outcome', 'description', 'desc'].some(v => norm.includes(v))) skillField = f;
                else if (!topicField && ['topic', 'strand', 'theme', 'content'].some(v => norm.includes(v))) topicField = f;
                else if (!cogField && ['cognitive', 'bloom', 'level', 'cog'].some(v => norm.includes(v))) cogField = f;
            });

            if (qField || maxField) {
                const mappedData = results.data.map((row: any) => {
                    return processRowValues(
                        row[qField || fields[0]], 
                        row[skillField || fields[2]], 
                        row[topicField || fields[1]], 
                        row[cogField || fields[3]], 
                        row[maxField || fields[4] || fields[fields.length-1]]
                    );
                });
                setPreviewData(mappedData);
                setStep('preview');
            } else {
                Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: true,
                    delimiter: delimiter,
                    complete: (res2) => {
                        const mappedData = res2.data.map((row: any[]) => {
                            const qStr = String(row[0] || '').trim();
                            let maxStr = '';
                            let skillStr = '';
                            let topicStr = '';
                            let cogStr = '';
                            
                            if (row.length >= 5) {
                                topicStr = row[1];
                                skillStr = row[2];
                                cogStr = row[3];
                                maxStr = row[4];
                            } else if (row.length === 4) {
                                skillStr = row[1];
                                cogStr = row[2];
                                maxStr = row[3];
                            } else if (row.length === 3) {
                                skillStr = row[1];
                                maxStr = row[2];
                            } else if (row.length === 2) {
                                maxStr = row[1];
                            }
                            
                            return processRowValues(qStr, skillStr, topicStr, cogStr, maxStr);
                        });
                        setPreviewData(mappedData);
                        setStep('preview');
                    }
                });
            }
        }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setText(result);
        handleParse(result);
      };
      reader.readAsText(file);
    }
  };

  const updateRow = (id: string, field: keyof ParsedRow, value: any) => {
    setPreviewData(prev => prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        
        const errors = [];
        if (!updated.question_number.trim()) errors.push("Missing Question Label");
        const maxNum = parseFloat(updated.max_mark);
        if (!updated.max_mark.trim() || isNaN(maxNum) || maxNum <= 0) errors.push("Invalid Max Mark");
        
        updated.isValid = errors.length === 0;
        updated.errors = errors;
        return updated;
    }));
  };

  const removeRow = (id: string) => {
      setPreviewData(prev => prev.filter(r => r.id !== id));
  };

  const handleConfirm = () => {
      const validRows = previewData.filter(r => r.isValid);
      if (validRows.length === 0) {
          showError("No valid questions to import.");
          return;
      }

      const finalQuestions: AssessmentQuestion[] = validRows.map(r => ({
          id: crypto.randomUUID(),
          question_number: r.question_number,
          skill_description: r.skill_description,
          topic: r.topic,
          cognitive_level: r.cognitive_level,
          max_mark: parseFloat(r.max_mark)
      }));

      onImport(finalQuestions, importMode);
      showSuccess(`Imported ${finalQuestions.length} questions.`);
      onOpenChange(false);
      reset();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
          "flex flex-col p-0 overflow-hidden transition-all duration-300",
          step === 'input' ? "max-w-2xl" : "max-w-[95vw] w-[1000px] h-[85vh]"
      )}>
        <div className="p-6 pb-4 border-b bg-muted/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Bulk Question Import
            </DialogTitle>
            <DialogDescription>
                {step === 'input' 
                    ? "Paste your question blueprint from Excel or upload a CSV." 
                    : "Review and fix parsed questions before saving."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {step === 'input' ? (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data Source</label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8">
                            <Upload className="mr-2 h-4 w-4" /> Upload CSV
                        </Button>
                        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    </div>
                </div>

                <Textarea 
                    className="h-64 font-mono text-xs whitespace-pre bg-muted/20" 
                    placeholder={`Question\tTopic\tSkill\tCognitive Level\tMax Mark\nQ1.1\tAlgebra\tSolve for x\tApplication\t4\nQ1.2\tAlgebra\tFactorise\tComprehension\t3`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-xs">
                    <HelpCircle className="h-5 w-5 shrink-0 text-blue-600" />
                    <div className="space-y-1">
                        <p className="font-bold uppercase tracking-tight text-blue-900">Tips for pasting:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Copy directly from Excel, Google Sheets, or a CSV file.</li>
                            <li>Include header rows if possible to ensure accurate column mapping.</li>
                            <li>Cognitive levels will be automatically matched to standard terms (e.g., "Knowledge", "Application").</li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
                    <Button onClick={() => handleParse(text)} disabled={!text.trim()}>Parse Data</Button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                <div className="p-4 border-b bg-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                            {previewData.length} Rows Parsed
                        </Badge>
                        {previewData.filter(r => !r.isValid).length > 0 && (
                            <Badge variant="destructive" className="text-sm px-3 py-1 bg-red-100 text-red-700 border-red-200">
                                {previewData.filter(r => !r.isValid).length} Invalid Rows
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Import Mode:</label>
                        <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                            <SelectTrigger className="w-40 h-8 bg-background font-bold text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="append">Append to existing</SelectItem>
                                <SelectItem value="replace" className="text-destructive font-bold">Replace existing</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                    <div className="border rounded-xl shadow-sm bg-background overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-24 text-[10px] font-black uppercase">Q Number</TableHead>
                                    <TableHead className="w-44 text-[10px] font-black uppercase">Topic</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Skill</TableHead>
                                    <TableHead className="w-44 text-[10px] font-black uppercase">Cognitive Level</TableHead>
                                    <TableHead className="w-24 text-[10px] font-black uppercase text-center">Max</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewData.map(row => (
                                    <TableRow key={row.id} className={cn(!row.isValid && "bg-red-50/50")}>
                                        <TableCell className="p-2">
                                            <Input 
                                                value={row.question_number} 
                                                onChange={(e) => updateRow(row.id, 'question_number', e.target.value)} 
                                                className={cn("h-8 text-xs font-bold", !row.question_number && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <TopicCombobox
                                                value={row.topic || ""}
                                                onChange={(val) => updateRow(row.id, 'topic', val)}
                                                suggestions={topicSuggestions}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input 
                                                value={row.skill_description} 
                                                onChange={(e) => updateRow(row.id, 'skill_description', e.target.value)} 
                                                className="h-8 text-xs"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Select value={row.cognitive_level} onValueChange={(v: any) => updateRow(row.id, 'cognitive_level', v)}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="knowledge">Knowledge</SelectItem>
                                                    <SelectItem value="comprehension">Comprehension</SelectItem>
                                                    <SelectItem value="application">Application</SelectItem>
                                                    <SelectItem value="analysis">Analysis</SelectItem>
                                                    <SelectItem value="evaluation">Evaluation</SelectItem>
                                                    <SelectItem value="creation">Creation</SelectItem>
                                                    <SelectItem value="unknown">Unknown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input 
                                                value={row.max_mark} 
                                                onChange={(e) => updateRow(row.id, 'max_mark', e.target.value)} 
                                                className={cn("h-8 text-xs text-center font-bold", (!row.max_mark || isNaN(parseFloat(row.max_mark))) && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 text-center">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(row.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {previewData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No data parsed.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t bg-background flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {previewData.filter(r => !r.isValid).length > 0 && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 text-xs font-bold w-full">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                Please fix invalid marks before importing.
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => setStep('input')} className="flex-1 sm:flex-none">Back</Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={previewData.length === 0 || previewData.filter(r => !r.isValid).length > 0}
                            className="font-bold flex-1 sm:flex-none"
                        >
                            Import {previewData.filter(r => r.isValid).length} Questions
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};