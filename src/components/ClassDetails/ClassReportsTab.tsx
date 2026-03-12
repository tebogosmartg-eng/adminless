import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Share2, BarChart3, Lock } from "lucide-react";
import { TermFinalizationCard } from "./TermFinalizationCard";
import { ClassInfo } from "@/lib/types";

interface ClassReportsTabProps {
  classInfo: ClassInfo;
  isLocked: boolean;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportBulkPdf: () => void;
  onExportBlankList: () => void;
  onShare: () => void;
  onSasams: () => void;
  onOpenDiagnostic: () => void;
}

export const ClassReportsTab = ({
  classInfo,
  isLocked,
  onExportPdf,
  onExportCsv,
  onExportBulkPdf,
  onExportBlankList,
  onShare,
  onSasams,
  onOpenDiagnostic
}: ClassReportsTabProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Reports</CardTitle>
            <CardDescription>Generate individual reports and marksheets.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" onClick={onExportPdf} className="justify-start h-11">
              <FileText className="mr-3 h-4 w-4 text-blue-500" /> Class Marksheet (PDF)
            </Button>
            <Button variant="outline" onClick={onExportCsv} className="justify-start h-11">
              <FileText className="mr-3 h-4 w-4 text-slate-500" /> Export Data (CSV)
            </Button>
            <Button variant="outline" onClick={onExportBulkPdf} className="justify-start h-11">
              <Download className="mr-3 h-4 w-4 text-green-500" /> Learner Report Cards (PDF)
            </Button>
            <Button variant="outline" onClick={onExportBlankList} className="justify-start h-11">
              <FileText className="mr-3 h-4 w-4 text-orange-500" /> Blank List (PDF)
            </Button>
            <Button variant="outline" onClick={onShare} className="justify-start h-11">
              <Share2 className="mr-3 h-4 w-4 text-indigo-500" /> Class Summary
            </Button>
            <Button variant="outline" onClick={onOpenDiagnostic} className="justify-start h-11">
              <BarChart3 className="mr-3 h-4 w-4 text-primary" /> Diagnostic Report (PDF)
            </Button>
            <Button variant="outline" onClick={onSasams} disabled={!isLocked} className="justify-start h-11">
              <Download className="mr-3 h-4 w-4 text-primary" /> SA-SAMS Export (CSV)
              {!isLocked && <Lock className="ml-auto h-3 w-3 opacity-30" />}
            </Button>
          </CardContent>
        </Card>
      </div>
      <div>
        <TermFinalizationCard classInfo={classInfo} />
      </div>
    </div>
  );
};