"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, AlertTriangle, FileArchive, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { ClassInfo } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { useSettings } from "@/context/SettingsContext";
import { checkClassTermIntegrity } from "@/utils/integrity";
import { generateAndDownloadExportPack } from "@/services/exportPack";
import { showSuccess, showError } from "@/utils/toast";

interface TermFinalizationCardProps {
  classInfo: ClassInfo;
}

export const TermFinalizationCard = ({ classInfo }: TermFinalizationCardProps) => {
  const { activeTerm, activeYear, assessments, marks } = useAcademic();
  const { finalizeClassTerm } = useClasses();
  const settings = useSettings();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const integrityReport = useMemo(() => {
    const termAssessments = assessments.filter(a => a.class_id === classInfo.id && a.term_id === activeTerm?.id);
    const termMarks = marks.filter(m => termAssessments.some(a => a.id === m.assessment_id));
    return checkClassTermIntegrity(termAssessments, classInfo.learners, termMarks);
  }, [assessments, marks, classInfo, activeTerm]);

  const isFinalised = !!classInfo.is_finalised;
  const canFinalize = integrityReport.isValid && !isFinalised;

  const handleFinalize = async () => {
    if (!confirm("Are you sure you want to finalize this class? All marks and assessments for this term will become locked and read-only.")) return;
    
    setIsProcessing(true);
    try {
        await finalizeClassTerm(classInfo.id);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadPack = async () => {
    if (!activeTerm || !activeYear) return;
    setIsExporting(true);
    try {
        await generateAndDownloadExportPack(classInfo.id, activeTerm.id, activeYear.id, settings);
        showSuccess("Export Pack downloaded successfully.");
    } catch (e: any) {
        showError("Failed to assemble export pack.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Card className={isFinalised ? "border-green-200 bg-green-50/10" : "border-primary/20 bg-primary/5"}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            {isFinalised ? <Lock className="h-5 w-5 text-green-600" /> : <FileArchive className="h-5 w-5 text-primary" />}
            Term Control
          </CardTitle>
          <CardDescription>
            {isFinalised 
                ? "This class is locked for the term. Generating professional export packs is available."
                : "Verify data integrity and securely lock this class's term records."}
          </CardDescription>
        </div>
        {isFinalised && (
            <Badge className="bg-green-600 hover:bg-green-600 uppercase tracking-widest text-[10px] font-black h-6 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Term Locked
            </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isFinalised ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-card border rounded-xl shadow-sm">
                <div className="space-y-1">
                    <h4 className="font-bold text-sm">Term Export Pack</h4>
                    <p className="text-xs text-muted-foreground">Download a ZIP file containing the Marksheet, POA, Analytics, Moderation Sample, and SA-SAMS records.</p>
                </div>
                <Button onClick={handleDownloadPack} disabled={isExporting} className="w-full sm:w-auto h-12 px-6 font-bold shadow-md bg-blue-600 hover:bg-blue-700">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download ZIP Pack
                </Button>
            </div>
        ) : (
            <div className="space-y-4">
                {!integrityReport.isValid && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">
                        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">Cannot Finalize: Integrity Issues Detected</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-xs">
                                {integrityReport.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
                <div className="flex justify-end">
                    <Button 
                        onClick={handleFinalize} 
                        disabled={!canFinalize || isProcessing} 
                        variant={canFinalize ? "default" : "secondary"}
                        className="font-bold h-10"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                        Finalize & Lock Marks
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};