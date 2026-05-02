import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Share2, BarChart3, Lock, Globe } from "lucide-react";
import { TermFinalizationCard } from "./TermFinalizationCard";
import { ClassInfo } from "@/lib/types";
import { LANGUAGES } from "@/lib/translations";
import { useAsyncState } from "@/hooks/useAsyncState";
import { AsyncStatus } from "@/components/ui/AsyncStatus";

interface ClassReportsTabProps {
  classInfo: ClassInfo;
  isLocked: boolean;
  onExportPdf: (lang: string) => void;
  onExportCsv: (lang: string) => void;
  onExportBulkPdf: (lang: string) => void;
  onExportBlankList: (lang: string) => void;
  onShare: (lang: string) => void;
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
  const [exportLanguage, setExportLanguage] = useState("en");
  const actionState = useAsyncState();
  useQuery({
    queryKey: ["reports", classInfo.id],
    queryFn: async () => ({ classId: classInfo.id, ready: true }),
    staleTime: 60_000,
  });

  const runAction = (action: () => void | Promise<void>) => {
    void actionState
      .run(
        async () => {
          await action();
        },
        { status: "loading", userInitiated: false },
      )
      .catch(() => {
        // Error is surfaced through AsyncStatus.
      });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto animate-in fade-in duration-500 w-full">
      <div className="space-y-6">
        <AsyncStatus state={{ status: actionState.status, error: actionState.error, retry: actionState.retry }} />
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Class Reports</CardTitle>
                <CardDescription>Generate individual reports and marksheets.</CardDescription>
              </div>
              <div className="w-40 flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select value={exportLanguage ?? ""} onValueChange={setExportLanguage}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Button variant="outline" onClick={() => runAction(() => onExportPdf(exportLanguage))} className="justify-start h-11 text-xs sm:text-sm">
              <FileText className="mr-3 h-4 w-4 text-blue-500 shrink-0" /> Class Marksheet (PDF)
            </Button>
            <Button variant="outline" onClick={() => runAction(() => onExportCsv(exportLanguage))} className="justify-start h-11 text-xs sm:text-sm">
              <FileText className="mr-3 h-4 w-4 text-slate-500 shrink-0" /> Export Data (CSV)
            </Button>
            <Button variant="outline" onClick={() => runAction(() => onExportBulkPdf(exportLanguage))} className="justify-start h-11 text-xs sm:text-sm">
              <Download className="mr-3 h-4 w-4 text-green-500 shrink-0" /> Learner Report Cards
            </Button>
            <Button variant="outline" onClick={() => runAction(() => onExportBlankList(exportLanguage))} className="justify-start h-11 text-xs sm:text-sm">
              <FileText className="mr-3 h-4 w-4 text-orange-500 shrink-0" /> Blank List (PDF)
            </Button>
            <Button variant="outline" onClick={() => runAction(() => onShare(exportLanguage))} className="justify-start h-11 text-xs sm:text-sm">
              <Share2 className="mr-3 h-4 w-4 text-indigo-500 shrink-0" /> Class Summary
            </Button>
            <Button variant="outline" onClick={() => runAction(onOpenDiagnostic)} className="justify-start h-11 text-xs sm:text-sm">
              <BarChart3 className="mr-3 h-4 w-4 text-primary shrink-0" /> Diagnostic Report
            </Button>
            <Button variant="outline" onClick={() => runAction(onSasams)} disabled={!isLocked} className="justify-start h-11 text-xs sm:text-sm">
              <Download className="mr-3 h-4 w-4 text-primary shrink-0" /> SA-SAMS Export
              {!isLocked && <Lock className="ml-auto h-3 w-3 opacity-30 shrink-0" />}
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="w-full">
        <TermFinalizationCard classInfo={classInfo} />
      </div>
    </div>
  );
};