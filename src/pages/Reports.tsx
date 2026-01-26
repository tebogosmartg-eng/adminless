import { useState } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useReportsData } from '@/hooks/useReportsData';
import { useTermReportData } from '@/hooks/useTermReportData';
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
  const { gradingScheme, schoolName, teacherName } = useSettings();
  const { terms, years, activeYear } = useAcademic();

  // Legacy/Manual Aggregation Hook
  const manualReports = useReportsData(classes);

  // New Term Logic Hook
  const { loading: termLoading, reportData, generateTermReport } = useTermReportData();
  const [termReportGrade, setTermReportGrade] = useState("all");
  const [termReportSubject, setTermReportSubject] = useState("all");
  const [selectedTermId, setSelectedTermId] = useState("");

  const handleExportTermPDF = () => {
    if (!reportData || !selectedTermId) return;
    
    const termName = terms.find(t => t.id === selectedTermId)?.name || "Term Report";
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`${schoolName} - ${termName} Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Grade: ${termReportGrade} | Subject: ${termReportSubject}`, 14, 28);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 34);

    // Get all unique assessment titles for headers
    const assessmentTitles = Array.from(new Set(reportData.flatMap(r => Object.keys(r.assessments))));

    const head = [['Name', 'Class', ...assessmentTitles, 'Final %', 'Sym']];
    const body = reportData.map(r => {
        const symbol = getGradeSymbol(r.termAverage, gradingScheme);
        return [
            r.learnerName,
            r.className,
            ...assessmentTitles.map(t => r.assessments[t] || '-'),
            r.termAverage,
            symbol?.symbol || '-'
        ];
    });

    autoTable(doc, {
        startY: 40,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    doc.save(`${termReportGrade}_${termReportSubject}_${termName}.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate comprehensive performance reports.</p>
      </div>

      <Tabs defaultValue="term" className="w-full">
        <TabsList>
            <TabsTrigger value="term">Term Reports (New)</TabsTrigger>
            <TabsTrigger value="manual">Manual Aggregate (Legacy)</TabsTrigger>
        </TabsList>

        <TabsContent value="term" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Select parameters for the term report.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Academic Year</label>
                            <div className="p-2 border rounded bg-muted/20 text-sm font-medium">
                                {activeYear ? activeYear.name : "No Active Year"}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Term</label>
                            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                                <SelectContent>
                                    {terms.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name} {t.closed ? "(Closed)" : ""}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grade</label>
                            <Select value={termReportGrade} onValueChange={setTermReportGrade}>
                                <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                <SelectContent>
                                    {manualReports.uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select value={termReportSubject} onValueChange={setTermReportSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {manualReports.uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => generateTermReport(selectedTermId, termReportGrade, termReportSubject)}
                            disabled={termLoading || !selectedTermId || termReportGrade === 'all' || termReportSubject === 'all'}
                        >
                            {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Report"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 min-h-[500px] flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Report Preview</CardTitle>
                            <CardDescription>
                                {reportData ? `Results for ${reportData.length} learners` : "Select options to view results."}
                            </CardDescription>
                        </div>
                        {reportData && (
                            <Button variant="outline" size="sm" onClick={handleExportTermPDF}>
                                <FileDown className="mr-2 h-4 w-4" /> Export PDF
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {reportData ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        <TableHead>Class</TableHead>
                                        {/* Dynamic Assessment Headers */}
                                        {Object.keys(reportData[0]?.assessments || {}).map((title, i) => (
                                            <TableHead key={i} className="text-xs">{title}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead className="text-center">Sym</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map((r, i) => {
                                        const symbol = getGradeSymbol(r.termAverage, gradingScheme);
                                        return (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{r.learnerName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{r.className}</TableCell>
                                                {Object.keys(reportData[0]?.assessments || {}).map((title, j) => (
                                                    <TableCell key={j} className="text-xs">
                                                        {r.assessments[title]}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-bold">{r.termAverage}</TableCell>
                                                <TableCell className="text-center">
                                                    {symbol && (
                                                        <Badge variant="outline" className={symbol.badgeColor}>{symbol.symbol}</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No report generated yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="manual">
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
                    onExportCSV={() => {}} // simplified for manual tab
                    onExportPDF={() => {}} // simplified for manual tab
                />
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;