import { useState, useEffect, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useReportsData } from '@/hooks/useReportsData';
import { useTermReportData } from '@/hooks/useTermReportData';
import { useYearReportData } from '@/hooks/useYearReportData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, ShieldCheck, FileSpreadsheet, Lock, ChevronRight, AlertCircle, ArrowRight, Download, ShieldAlert } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { addHeader, SchoolProfile, addFooter } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { Link } from 'react-router-dom';
import { generateSASAMSExport } from '@/utils/sasams';
import { cn } from '@/lib/utils';

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { terms, years, activeYear, activeTerm, assessments, marks } = useAcademic();
  const { isReadyForFinalization, missingRequired } = useSetupStatus();

  const profile: SchoolProfile = { 
    name: schoolName, 
    teacher: teacherName, 
    logo: schoolLogo, 
    email: contactEmail, 
    phone: contactPhone 
  };

  const manualReports = useReportsData(classes);
  const { loading: termLoading, reportData: termData, generateTermReport, allAssessmentTitles } = useTermReportData();
  const { loading: yearLoading, yearData, generateYearReport } = useYearReportData();

  const [termReportGrade, setTermReportGrade] = useState("all");
  const [termReportSubject, setTermReportSubject] = useState("all");
  
  const [yearReportGrade, setYearReportGrade] = useState("all");
  const [yearReportSubject, setYearReportSubject] = useState("all");
  
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id || "");
  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "");

  useEffect(() => {
      if (activeTerm) setSelectedTermId(activeTerm.id);
  }, [activeTerm?.id]);

  useEffect(() => {
      if (activeYear) setSelectedYearId(activeYear.id);
  }, [activeYear?.id]);

  const selectedTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
  const isTermClosed = !!selectedTerm?.closed;

  const integrityReport = useMemo(() => {
    if (!selectedTermId || termReportGrade === 'all' || termReportSubject === 'all') return null;
    
    const targetClasses = classes.filter(c => c.grade === termReportGrade && c.subject === termReportSubject && !c.archived);
    const targetAssessments = assessments.filter(a => a.term_id === selectedTermId && targetClasses.some(c => c.id === a.class_id));
    const targetMarks = marks.filter(m => targetAssessments.some(a => a.id === m.assessment_id));
    const targetLearners = targetClasses.flatMap(c => c.learners);

    return checkClassTermIntegrity(targetAssessments, targetLearners, targetMarks);
  }, [selectedTermId, termReportGrade, termReportSubject, classes, assessments, marks]);

  const handleExportTermPDF = () => {
    if (!termData || !selectedTermId) return;
    
    try {
        const termName = selectedTerm?.name || "Term Report";
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = addHeader(doc, profile, `${termName} Performance Summary: ${termReportGrade} ${termReportSubject}`);
        
        const tableBody = termData.map(r => [
            r.learnerName,
            r.className,
            ...allAssessmentTitles.map(title => r.assessments[title] || "-"),
            `${r.termAverage}%`,
            getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-'
        ]);

        autoTable(doc, {
            startY: startY + 5,
            head: [['Learner', 'Class', ...allAssessmentTitles, 'Average', 'Symbol']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 37, 36], textColor: 255 },
            styles: { fontSize: 8 },
        });

        addFooter(doc);
        doc.save(`${termReportGrade}_${termReportSubject}_${termName}_Report.pdf`);
        showSuccess("PDF exported successfully.");
    } catch (e) {
        showError("Failed to generate PDF.");
    }
  };

  const handleExportTermCSV = () => {
    if (!termData) return;
    
    try {
        const termName = selectedTerm?.name || "Term Report";
        let csv = 'Learner,Class,' + allAssessmentTitles.join(',') + ',Average,Symbol\n';
        
        termData.forEach(r => {
            const assessmentValues = allAssessmentTitles.map(title => r.assessments[title] || "-").join(',');
            const symbol = getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-';
            csv += `"${r.learnerName}","${r.className}",${assessmentValues},${r.termAverage}%,${symbol}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Term_Report_${termReportGrade}_${termReportSubject}_${termName}.csv`;
        link.click();
        showSuccess("CSV exported successfully.");
    } catch (e) {
        showError("Failed to generate CSV.");
    }
  };

  const handleSASAMSExport = () => {
    if (!termData || !selectedTerm) return;

    // RULE: Term must be finalised
    if (!selectedTerm.closed) {
        showError("Export Blocked: Term must be finalised in Settings before SA-SAMS export.");
        return;
    }

    // RULE: Marks must be complete
    if (integrityReport && !integrityReport.isValid) {
        showError(`Export Blocked: ${integrityReport.errors[0] || "Marks are incomplete or invalid."}`);
        return;
    }
    
    try {
        const classesInReport = Array.from(new Set(termData.map(r => r.className)));
        
        classesInReport.forEach(clsName => {
            const clsLearners = termData
                .filter(r => r.className === clsName)
                .map(r => ({ name: r.learnerName, mark: r.termAverage.toString(), id: 'exists' }));
            
            const targetClass = classes.find(c => c.className === clsName && c.subject === termReportSubject);
            if (!targetClass) return;

            const classAss = assessments.filter(a => a.class_id === targetClass.id && a.term_id === selectedTerm.id);
            const classMarks = marks.filter(m => classAss.some(a => a.id === m.assessment_id));

            generateSASAMSExport(
                clsLearners, 
                classAss, 
                classMarks, 
                clsName, 
                termReportSubject, 
                selectedTerm.name
            );
        });

        showSuccess(`Generated SA-SAMS export files for ${classesInReport.length} classes.`);
    } catch (e) {
        showError("SA-SAMS export failed.");
    }
  };

  if (!isReadyForFinalization) {
      return (
          <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground text-sm">Automated formal assessment reporting.</p>
              </div>

              <Card className="border-amber-200 bg-amber-50 shadow-lg animate-in zoom-in duration-300">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                            <Lock className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-amber-900">Final Reporting Blocked</CardTitle>
                            <CardDescription className="text-amber-800">
                                Global reports cannot be generated until your setup checklist is complete.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" /> Mandatory Missing Steps
                        </h4>
                        <div className="grid gap-2">
                            {missingRequired.map(step => (
                                <div key={step.id} className="flex items-center justify-between p-3 rounded-md bg-white border border-amber-200">
                                    <span className="text-sm font-medium text-amber-900">{step.title}</span>
                                    <ChevronRight className="h-4 w-4 text-amber-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 font-bold" asChild>
                        <Link to="/">
                            Return to Checklist <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">Global reports tied to your active academic session.</p>
      </div>

      <Tabs defaultValue="term" className="w-full">
        <TabsList className="bg-muted/50 p-1 border">
            <TabsTrigger value="term" className="px-6">Term Reports</TabsTrigger>
            <TabsTrigger value="year" className="px-6">Year End Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="term" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Select Term</label>
                            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Term" /></SelectTrigger>
                                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Target Grade</label>
                            <Select value={termReportGrade} onValueChange={setTermReportGrade}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Subject Area</label>
                            <Select value={termReportSubject} onValueChange={setTermReportSubject}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        
                        {integrityReport && (
                            <div className="pt-4 border-t">
                                <IntegrityGuard report={integrityReport} />
                            </div>
                        )}

                        <Button 
                            className="w-full mt-4 h-11 font-bold" 
                            onClick={() => generateTermReport(selectedTermId, termReportGrade, termReportSubject)}
                            disabled={termLoading || !selectedTermId || termReportGrade === 'all' || (integrityReport && !integrityReport.isValid)}
                        >
                            {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Report"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 min-h-[600px] flex flex-col border-none shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row justify-between items-center border-b bg-muted/5">
                        <CardTitle className="text-lg">Results Preview</CardTitle>
                        {termData && (
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleSASAMSExport} 
                                    className={cn(
                                        "h-8 gap-2 transition-all",
                                        isTermClosed ? "border-primary text-primary hover:bg-primary/5" : "opacity-50"
                                    )}
                                >
                                    <Download className="h-3.5 w-3.5" /> SA-SAMS
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExportTermCSV} className="h-8 gap-2">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-green-600"/> CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExportTermPDF} className="h-8 gap-2">
                                    <FileDown className="h-3.5 w-3.5 text-blue-600"/> PDF
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {termData ? (
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        <TableHead>Class</TableHead>
                                        {allAssessmentTitles.map(title => (
                                            <TableHead key={title} className="text-right whitespace-nowrap">{title}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead className="text-center">Symbol</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {termData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{r.className}</TableCell>
                                            {allAssessmentTitles.map(title => (
                                                <TableCell key={title} className="text-right text-xs">
                                                    {r.assessments[title] || "-"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-primary">{r.termAverage}%</TableCell>
                                            <TableCell className="text-center">
                                                {getGradeSymbol(r.termAverage, gradingScheme) && (
                                                    <Badge variant="outline" className={getGradeSymbol(r.termAverage, gradingScheme)?.badgeColor}>
                                                        {getGradeSymbol(r.termAverage, gradingScheme)?.symbol}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-12 text-center">
                                <ShieldCheck className="h-16 w-16 opacity-10" />
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-foreground">Ready to Aggregate</h3>
                                    <p className="text-xs max-w-xs">Select your filters and verify data integrity to generate a term-wide performance summary.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;