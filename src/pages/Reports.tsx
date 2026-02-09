import { useState, useEffect, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTermReportData } from '@/hooks/useTermReportData';
import { useYearReportData } from '@/hooks/useYearReportData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, ShieldCheck, FileSpreadsheet, Lock, ChevronRight, AlertCircle, ArrowRight, Download, GraduationCap, FileStack, LayoutGrid } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { addHeader, SchoolProfile, addFooter } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { Link } from 'react-router-dom';
import { generateSASAMSExport } from '@/utils/sasams';
import { cn } from '@/lib/utils';
import { db } from '@/db';

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { terms, years, activeYear, activeTerm, assessments, marks } = useAcademic();
  const { isReadyForFinalization, missingRequired } = useSetupStatus();

  const profile: SchoolProfile = { 
    name: schoolName, 
    teacher: teacherName, 
    logo: schoolLogo, 
    email: contactEmail, 
    phone: contactPhone 
  };

  const { loading: termLoading, reportData: termData, generateTermReport, allAssessmentTitles, setReportData } = useTermReportData();
  const { loading: yearLoading, yearData, generateYearReport, setYearData } = useYearReportData();

  // Context Selection State
  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "");
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id || "");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState("all");

  // Derive unique filters from classes
  const uniqueGrades = useMemo(() => Array.from(new Set(classes.map(c => c.grade))).sort(), [classes]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(classes.map(c => c.subject))).sort(), [classes]);

  const availableClasses = useMemo(() => {
      return classes.filter(c => 
          !c.archived && 
          (selectedGrade === 'all' || c.grade === selectedGrade) && 
          (selectedSubject === 'all' || c.subject === selectedSubject)
      );
  }, [classes, selectedGrade, selectedSubject]);

  useEffect(() => {
      if (activeTerm) setSelectedTermId(activeTerm.id);
  }, [activeTerm?.id]);

  useEffect(() => {
      if (activeYear) setSelectedYearId(activeYear.id);
  }, [activeYear?.id]);

  // Reset class when higher filters change
  useEffect(() => {
      setSelectedClassId("all");
      setReportData(null);
      setYearData(null);
  }, [selectedGrade, selectedSubject, selectedTermId, setReportData, setYearData]);

  const selectedTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
  const isTermClosed = !!selectedTerm?.closed;

  const isContextComplete = selectedYearId && selectedTermId && selectedGrade !== 'all' && selectedSubject !== 'all' && selectedClassId !== 'all';

  const integrityReport = useMemo(() => {
    if (!isContextComplete) return null;
    
    const targetAssessments = assessments.filter(a => a.term_id === selectedTermId && a.class_id === selectedClassId);
    const targetMarks = marks.filter(m => targetAssessments.some(a => a.id === m.assessment_id));
    const targetClass = classes.find(c => c.id === selectedClassId);
    const targetLearners = targetClass ? targetClass.learners : [];

    return checkClassTermIntegrity(targetAssessments, targetLearners, targetMarks);
  }, [isContextComplete, selectedTermId, selectedClassId, assessments, marks, classes]);

  const handleGenerateTerm = () => {
    if (!isContextComplete) return;
    generateTermReport(selectedTermId, selectedGrade, selectedSubject);
  };

  const handleGenerateYear = () => {
      if (!selectedYearId || selectedClassId === 'all') return;
      generateYearReport(selectedYearId, selectedClassId);
  };

  const handleExportTermCSV = () => {
    if (!termData || !selectedClassId) return;

    const targetClassName = classes.find(c => c.id === selectedClassId)?.className || "Class";
    const termName = selectedTerm?.name || "Term";
    
    const displayData = termData.filter(r => r.className === targetClassName);

    const header = ["Learner Name", "Class", ...allAssessmentTitles, "Term Average", "Symbol"].join(",");
    const rows = displayData.map(r => {
        const symbol = getGradeSymbol(r.termAverage, gradingScheme)?.symbol || "-";
        return [
            `"${r.learnerName}"`,
            `"${r.className}"`,
            ...allAssessmentTitles.map(title => `"${r.assessments[title] || "-"}"`),
            r.termAverage,
            `"${symbol}"`
        ].join(",");
    });

    const csvContent = header + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedGrade}_${selectedSubject}_${termName}_Summary.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("CSV exported successfully.");
  };

  const handleExportTermPDF = () => {
    if (!termData || !selectedTermId) return;
    
    try {
        const termName = selectedTerm?.name || "Term Report";
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = addHeader(doc, profile, `${termName} Performance Summary: ${selectedGrade} ${selectedSubject}`);
        
        const targetClassName = classes.find(c => c.id === selectedClassId)?.className;
        const displayData = termData.filter(r => r.className === targetClassName);

        const tableBody = displayData.map(r => [
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
        doc.save(`${selectedGrade}_${selectedSubject}_${termName}_Report.pdf`);
        showSuccess("PDF exported successfully.");
    } catch (e) {
        showError("Failed to generate PDF.");
    }
  };

  const handleSASAMSExport = () => {
    if (!termData || !selectedTerm || !activeYear || selectedClassId === 'all') return;

    if (!selectedTerm.closed) {
        showError("Export Blocked: Term must be finalised in Settings before SA-SAMS export.");
        return;
    }

    if (integrityReport && !integrityReport.isValid) {
        showError(`Export Blocked: ${integrityReport.errors[0] || "Marks are incomplete or invalid."}`);
        return;
    }
    
    try {
        const targetClass = classes.find(c => c.id === selectedClassId);
        if (!targetClass) return;

        const exportLearners = targetClass.learners.map(l => {
            const match = termData.find(d => d.learnerName === l.name && d.className === targetClass.className);
            return {
                ...l,
                mark: match ? match.termAverage.toString() : "0"
            };
        });

        generateSASAMSExport(
            exportLearners, 
            targetClass.className, 
            targetClass.grade,
            selectedSubject, 
            selectedTerm.name,
            activeYear.name,
            teacherName,
            schoolCode
        );

        showSuccess(`Generated SA-SAMS summary for ${targetClass.className}.`);
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
              <Card className="border-amber-200 bg-amber-50 shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600"><Lock className="h-8 w-8" /></div>
                        <div>
                            <CardTitle className="text-xl text-amber-900">Final Reporting Blocked</CardTitle>
                            <CardDescription className="text-amber-800">Complete setup checklist before generating global reports.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        {missingRequired.map(step => (
                            <div key={step.id} className="flex items-center justify-between p-3 rounded-md bg-white border border-amber-200">
                                <span className="text-sm font-medium text-amber-900">{step.title}</span>
                                <ChevronRight className="h-4 w-4 text-amber-400" />
                            </div>
                        ))}
                    </div>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 font-bold" asChild><Link to="/">Return to Checklist <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">Analytical data is strictly caged to the selected class context.</p>
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
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Class Context</CardTitle>
                        <CardDescription>Select all parameters to unlock data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Academic Year</label>
                            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Term</label>
                            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Term" /></SelectTrigger>
                                <SelectContent>{terms.filter(t => t.year_id === selectedYearId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Grade</label>
                            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Grade" /></SelectTrigger>
                                <SelectContent>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Subject</label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Subject" /></SelectTrigger>
                                <SelectContent>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Specific Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                <SelectContent>
                                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {integrityReport && (
                            <div className="pt-4 border-t">
                                <IntegrityGuard report={integrityReport} />
                            </div>
                        )}

                        <Button 
                            className="w-full mt-4 h-11 font-bold" 
                            onClick={handleGenerateTerm}
                            disabled={termLoading || !isContextComplete || !integrityReport?.isValid}
                        >
                            {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load Analytical Data"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 min-h-[600px] flex flex-col border-none shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b bg-muted/5 gap-4">
                        <CardTitle className="text-lg">Class Results Summary</CardTitle>
                        {termData && isContextComplete && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={handleSASAMSExport} className={cn("h-8 gap-2", isTermClosed ? "border-primary text-primary" : "opacity-50")}><Download className="h-3.5 w-3.5" /> SA-SAMS</Button>
                                <Button variant="outline" size="sm" onClick={handleExportTermCSV} className="h-8 gap-2"><FileSpreadsheet className="h-3.5 w-3.5 text-green-600"/> CSV</Button>
                                <Button variant="outline" size="sm" onClick={handleExportTermPDF} className="h-8 gap-2"><FileDown className="h-3.5 w-3.5 text-blue-600"/> PDF</Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {termData && isContextComplete ? (
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        {allAssessmentTitles.map(title => (
                                            <TableHead key={title} className="text-right whitespace-nowrap">{title}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead className="text-center">Symbol</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {termData
                                      .filter(r => {
                                          const cls = classes.find(c => c.id === selectedClassId);
                                          return r.className === cls?.className;
                                      })
                                      .map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
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
                                <LayoutGrid className="h-16 w-16 opacity-10" />
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-foreground">Select Context to Begin</h3>
                                    <p className="text-xs max-w-xs">Data is caged to specific class selections. Choose a class from the sidebar to view analytical results.</p>
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
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Yearly Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Academic Cycle</label>
                            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Grade</label>
                            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Grade" /></SelectTrigger>
                                <SelectContent>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Subject</label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Subject" /></SelectTrigger>
                                <SelectContent>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Specific Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                <SelectContent>
                                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full mt-4 h-11 font-bold" onClick={handleGenerateYear} disabled={yearLoading || selectedClassId === 'all'}>
                            {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Consolidate Year Data"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 min-h-[500px] flex flex-col border-none shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row justify-between items-center bg-muted/5 border-b">
                        <CardTitle>Year End Consolidation</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-auto">
                        {yearData && selectedClassId !== 'all' ? (
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Learner Name</TableHead>
                                        {terms.map(t => <TableHead key={t.id} className="text-right">{t.name}</TableHead>)}
                                        <TableHead className="text-right font-bold bg-primary/5">Year Final %</TableHead>
                                        <TableHead className="text-center bg-primary/5">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {yearData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            {terms.map(t => (
                                                <TableCell key={t.id} className="text-right text-xs">
                                                    {r.termMarks[t.name] !== null ? `${r.termMarks[t.name]}%` : "-"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-primary bg-primary/[0.02]">{r.finalYearMark}%</TableCell>
                                            <TableCell className="text-center bg-primary/[0.02]">
                                                <Badge variant={r.finalYearMark >= 50 ? "outline" : "destructive"} className={r.finalYearMark >= 50 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                    {r.finalYearMark >= 50 ? "Pass" : "Fail"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-12 text-center">
                                <GraduationCap className="h-16 w-16 opacity-10" />
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-foreground">Annual Summary</h3>
                                    <p className="text-xs max-w-xs">Consolidate all term marks into a final year-end performance report. Select a specific class to view analytical results.</p>
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