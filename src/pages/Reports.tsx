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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { addHeader, SchoolProfile, addFooter } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';
import { format } from 'date-fns';

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { terms, years, activeYear, activeTerm, assessments, marks } = useAcademic();

  const profile: SchoolProfile = { 
    name: schoolName, 
    teacher: teacherName, 
    logo: schoolLogo, 
    email: contactEmail, 
    phone: contactPhone 
  };

  const manualReports = useReportsData(classes);
  const { loading: termLoading, reportData: termData, generateTermReport } = useTermReportData();
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
        const termName = terms.find(t => t.id === selectedTermId)?.name || "Term Report";
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = addHeader(doc, profile, `${termName} Performance Summary: ${termReportGrade} ${termReportSubject}`);
        
        const tableBody = termData.map(r => [
            r.learnerName,
            r.className,
            ...Object.values(r.assessments),
            `${r.termAverage}%`,
            getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-'
        ]);

        const assessmentTitles = Object.keys(termData[0]?.assessments || {});

        autoTable(doc, {
            startY: startY + 5,
            head: [['Learner', 'Class', ...assessmentTitles, 'Average', 'Symbol']],
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
        const assessmentTitles = Object.keys(termData[0]?.assessments || {});
        let csv = 'Learner,Class,' + assessmentTitles.join(',') + ',Average,Symbol\n';
        
        termData.forEach(r => {
            const marks = Object.values(r.assessments).join(',');
            const symbol = getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-';
            csv += `"${r.learnerName}","${r.className}",${marks},${r.termAverage}%,${symbol}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Term_Report_${termReportGrade}_${termReportSubject}.csv`;
        link.click();
        showSuccess("CSV exported successfully.");
    } catch (e) {
        showError("Failed to generate CSV.");
    }
  };

  const handleExportYearPDF = () => {
    if (!yearData || !selectedYearId) return;
    
    try {
        const yearName = years.find(y => y.id === selectedYearId)?.name || "Year Report";
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = addHeader(doc, profile, `Year-End Summary: ${yearReportGrade} ${yearReportSubject} (${yearName})`);
        
        const termNames = terms.map(t => t.name);
        
        const tableBody = yearData.map(r => [
            r.learnerName,
            ...termNames.map(t => r.termMarks[t] ? `${r.termMarks[t]}%` : '-'),
            `${r.finalYearMark}%`,
            getGradeSymbol(r.finalYearMark, gradingScheme)?.symbol || '-'
        ]);

        autoTable(doc, {
            startY: startY + 5,
            head: [['Learner', ...termNames, 'Final %', 'Symbol']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 37, 36], textColor: 255 },
            styles: { fontSize: 9 },
        });

        addFooter(doc);
        doc.save(`Year_Report_${yearReportGrade}_${yearReportSubject}.pdf`);
        showSuccess("PDF exported successfully.");
    } catch (e) {
        showError("Failed to generate PDF.");
    }
  };

  const handleExportYearCSV = () => {
    if (!yearData) return;
    
    try {
        const termNames = terms.map(t => t.name);
        let csv = 'Learner,' + termNames.join(',') + ',Final %,Symbol\n';
        
        yearData.forEach(r => {
            const marks = termNames.map(t => r.termMarks[t] ? `${r.termMarks[t]}%` : '-').join(',');
            const symbol = getGradeSymbol(r.finalYearMark, gradingScheme)?.symbol || '-';
            csv += `"${r.learnerName}",${marks},${r.finalYearMark}%,${symbol}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Year_Report_${yearReportGrade}_${yearReportSubject}.csv`;
        link.click();
        showSuccess("CSV exported successfully.");
    } catch (e) {
        showError("Failed to generate CSV.");
    }
  };

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
                            disabled={termLoading || !selectedTermId || termReportGrade === 'all' || !integrityReport?.isValid}
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
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead className="text-center">Symbol</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {termData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{r.className}</TableCell>
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

        <TabsContent value="year" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Year Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Academic Year</label>
                            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Year" /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Target Grade</label>
                            <Select value={yearReportGrade} onValueChange={setYearReportGrade}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Subject Area</label>
                            <Select value={yearReportSubject} onValueChange={setYearReportSubject}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="w-full mt-4 h-11 font-bold" 
                            onClick={() => generateYearReport(selectedYearId, yearReportGrade, yearReportSubject)}
                            disabled={yearLoading || !selectedYearId || yearReportGrade === 'all'}
                        >
                            {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Calculate Year Summary"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 border-none shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    <CardHeader className="flex flex-row justify-between items-center border-b bg-muted/5">
                        <CardTitle className="text-lg">Year-End Preview</CardTitle>
                        {yearData && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleExportYearCSV} className="h-8 gap-2">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-green-600"/> CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExportYearPDF} className="h-8 gap-2">
                                    <FileDown className="h-3.5 w-3.5 text-blue-600"/> PDF
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        {yearData ? (
                             <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        {terms.map(t => <TableHead key={t.id} className="text-right font-bold">{t.name}</TableHead>)}
                                        <TableHead className="text-right font-bold text-primary bg-primary/5">Final Year %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {yearData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            {terms.map(t => (
                                                <TableCell key={t.id} className="text-right text-muted-foreground font-mono text-xs">
                                                    {r.termMarks[t.name] !== null ? `${r.termMarks[t.name]}%` : "-"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-black text-primary bg-primary/5">{r.finalYearMark}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-32 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <FileSpreadsheet className="h-12 w-12 opacity-10" />
                                <p className="text-sm">Configure parameters and calculate to view the weighted year end summary.</p>
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