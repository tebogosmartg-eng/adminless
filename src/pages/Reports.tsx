import { useState, useEffect } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useReportsData } from '@/hooks/useReportsData';
import { useTermReportData } from '@/hooks/useTermReportData';
import { useYearReportData } from '@/hooks/useYearReportData';
import { ReportsFilterCard } from '@/components/reports/ReportsFilterCard';
import { ReportsAssessmentSelector } from '@/components/reports/ReportsAssessmentSelector';
import { ReportsResults } from '@/components/reports/ReportsResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown } from 'lucide-react';

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName } = useSettings();
  const { terms, years, activeYear, activeTerm } = useAcademic();

  // Hooks
  const manualReports = useReportsData(classes);
  const { loading: termLoading, reportData: termData, generateTermReport } = useTermReportData();
  const { loading: yearLoading, yearData, generateYearReport } = useYearReportData();

  // State - Default to active context if available
  const [termReportGrade, setTermReportGrade] = useState("all");
  const [termReportSubject, setTermReportSubject] = useState("all");
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id || "");

  const [yearReportGrade, setYearReportGrade] = useState("all");
  const [yearReportSubject, setYearReportSubject] = useState("all");
  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "");

  // Update defaults if active context changes
  useEffect(() => {
      if (activeTerm && !selectedTermId) setSelectedTermId(activeTerm.id);
  }, [activeTerm]);

  useEffect(() => {
      if (activeYear && !selectedYearId) setSelectedYearId(activeYear.id);
  }, [activeYear]);

  // Term PDF Export
  const handleExportTermPDF = () => {
    if (!termData || !selectedTermId) return;
    const termName = terms.find(t => t.id === selectedTermId)?.name || "Term Report";
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${schoolName} - ${termName} Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Grade: ${termReportGrade} | Subject: ${termReportSubject}`, 14, 28);
    
    // Helper to extract keys safely
    const firstItem = termData[0];
    const assessmentTitles = firstItem ? Object.keys(firstItem.assessments) : [];
    
    const head = [['Name', 'Class', ...assessmentTitles, 'Final %', 'Sym']];
    const body = termData.map(r => {
        const symbol = getGradeSymbol(r.termAverage, gradingScheme);
        return [r.learnerName, r.className, ...assessmentTitles.map(t => r.assessments[t] || '-'), r.termAverage, symbol?.symbol || '-'];
    });
    autoTable(doc, { startY: 40, head, body });
    doc.save(`${termReportGrade}_${termReportSubject}_${termName}.pdf`);
  };

  // Year PDF Export
  const handleExportYearPDF = () => {
    if (!yearData || !selectedYearId) return;
    const yearName = years.find(y => y.id === selectedYearId)?.name || "Year Report";
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${schoolName} - ${yearName} Final Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Grade: ${yearReportGrade} | Subject: ${yearReportSubject}`, 14, 28);
    
    const firstItem = yearData[0];
    const termNames = firstItem ? Object.keys(firstItem.termMarks).sort() : [];
    
    const head = [['Name', ...termNames, 'Final Year %', 'Sym']];
    const body = yearData.map(r => {
        const symbol = getGradeSymbol(r.finalYearMark, gradingScheme);
        return [
            r.learnerName, 
            ...termNames.map(t => r.termMarks[t] !== null ? r.termMarks[t] : '-'), 
            r.finalYearMark, 
            symbol?.symbol || '-'
        ];
    });
    autoTable(doc, { startY: 40, head, body });
    doc.save(`${yearReportGrade}_${yearReportSubject}_${yearName}_Final.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate comprehensive performance reports.</p>
      </div>

      <Tabs defaultValue="term" className="w-full">
        <TabsList>
            <TabsTrigger value="term">Term Reports</TabsTrigger>
            <TabsTrigger value="year">Year End Report</TabsTrigger>
            <TabsTrigger value="manual">Manual Aggregate (Legacy)</TabsTrigger>
        </TabsList>

        {/* Term Report Tab */}
        <TabsContent value="term" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Term</label>
                            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grade</label>
                            <Select value={termReportGrade} onValueChange={setTermReportGrade}>
                                <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select value={termReportSubject} onValueChange={setTermReportSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => generateTermReport(selectedTermId, termReportGrade, termReportSubject)}
                            disabled={termLoading || !selectedTermId || termReportGrade === 'all'}
                        >
                            {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Report"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 min-h-[500px] flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>Preview</CardTitle>
                        {termData && <Button variant="outline" size="sm" onClick={handleExportTermPDF}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {termData ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        <TableHead>Class</TableHead>
                                        {Object.keys(termData[0]?.assessments || {}).map((t,i) => <TableHead key={i} className="text-xs">{t}</TableHead>)}
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead>Sym</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {termData.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{r.learnerName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{r.className}</TableCell>
                                            {Object.keys(termData[0]?.assessments || {}).map((t,j) => <TableCell key={j} className="text-xs">{r.assessments[t]}</TableCell>)}
                                            <TableCell className="text-right font-bold">{r.termAverage}</TableCell>
                                            <TableCell>{getGradeSymbol(r.termAverage, gradingScheme)?.symbol}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <div className="text-center text-muted-foreground py-10">No report generated.</div>}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        {/* Year Report Tab */}
        <TabsContent value="year" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>Year Config</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Academic Year</label>
                            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grade</label>
                            <Select value={yearReportGrade} onValueChange={setYearReportGrade}>
                                <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select value={yearReportSubject} onValueChange={setYearReportSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{manualReports.uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => generateYearReport(selectedYearId, yearReportGrade, yearReportSubject)}
                            disabled={yearLoading || !selectedYearId || yearReportGrade === 'all'}
                        >
                            {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Final Report"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 min-h-[500px] flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>Year Summary</CardTitle>
                        {yearData && <Button variant="outline" size="sm" onClick={handleExportYearPDF}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {yearData ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner Name</TableHead>
                                        {Object.keys(yearData[0]?.termMarks || {}).sort().map(t => <TableHead key={t}>{t}</TableHead>)}
                                        <TableHead className="text-right font-bold">Final Year %</TableHead>
                                        <TableHead>Symbol</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {yearData.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            {Object.keys(yearData[0]?.termMarks || {}).sort().map(t => (
                                                <TableCell key={t}>{r.termMarks[t] !== null ? r.termMarks[t] : '-'}</TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-lg">{r.finalYearMark}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getGradeSymbol(r.finalYearMark, gradingScheme)?.symbol || '-'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <div className="text-center text-muted-foreground py-10">No year report generated.</div>}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="manual">
            {/* Legacy Content */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                <ReportsFilterCard 
                    selectedGrade={manualReports.selectedGrade}
                    setSelectedGrade={manualReports.setSelectedGrade}
                    uniqueGrades={manualReports.uniqueGrades}
                    selectedSubject={manualReports.selectedSubject}
                    setSelectedSubject={manualReports.setSelectedSubject}
                    uniqueSubjects={manualReports.uniqueSubjects}
                />
                <ReportsAssessmentSelector 
                    filteredClasses={manualReports.filteredClasses}
                    selectedClassIds={manualReports.selectedClassIds}
                    weights={manualReports.weights}
                    onToggleClass={manualReports.handleClassToggle}
                    onWeightChange={manualReports.handleWeightChange}
                    onCalculate={manualReports.calculateResults}
                />
                </div>
                <div className="lg:col-span-2 space-y-6">
                <ReportsResults 
                    aggregatedData={manualReports.aggregatedData}
                    trendData={manualReports.trendData}
                    selectedClassIds={manualReports.selectedClassIds}
                    classes={classes}
                    weights={manualReports.weights}
                    gradingScheme={gradingScheme}
                    onExportCSV={() => {}} 
                    onExportPDF={() => {}} 
                />
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;