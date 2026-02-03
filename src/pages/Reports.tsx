import { useState, useEffect, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import jsPDF from 'jspdf';
import { useReportsData } from '@/hooks/useReportsData';
import { useTermReportData } from '@/hooks/useTermReportData';
import { useYearReportData } from '@/hooks/useYearReportData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, ShieldCheck } from 'lucide-react';
import { showError } from '@/utils/toast';
import { addHeader, SchoolProfile } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';

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
  
  // Year report specific filters
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
    if (!integrityReport?.isValid) {
        showError("Data integrity issues must be resolved before exporting.");
        return;
    }
    if (!termData || !selectedTermId) return;
    const termName = terms.find(t => t.id === selectedTermId)?.name || "Term Report";
    const doc = new jsPDF('l', 'mm', 'a4');
    addHeader(doc, profile, `${termName} Performance Summary`);
    // PDF rendering logic...
    doc.save(`${termReportGrade}_${termReportSubject}_${termName}.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Global reports tied to your active academic session.</p>
      </div>

      <Tabs defaultValue="term" className="w-full">
        <TabsList>
            <TabsTrigger value="term">Term Reports</TabsTrigger>
            <TabsTrigger value="year">Year End Report</TabsTrigger>
        </TabsList>

        <TabsContent value="term" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                    </CardHeader>
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
                        
                        {integrityReport && (
                            <div className="pt-4 border-t">
                                <IntegrityGuard report={integrityReport} />
                            </div>
                        )}

                        <Button 
                            className="w-full mt-4" 
                            onClick={() => generateTermReport(selectedTermId, termReportGrade, termReportSubject)}
                            disabled={termLoading || !selectedTermId || termReportGrade === 'all' || !integrityReport?.isValid}
                        >
                            {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Report"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 min-h-[500px] flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>Preview</CardTitle>
                        {termData && integrityReport?.isValid && (
                            <Button variant="outline" size="sm" onClick={handleExportTermPDF}>
                                <FileDown className="mr-2 h-4 w-4"/> Export PDF
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {termData ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead className="text-right font-bold">Term %</TableHead>
                                        <TableHead>Sym</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {termData.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{r.className}</TableCell>
                                            <TableCell className="text-right font-bold">{r.termAverage}%</TableCell>
                                            <TableCell>{getGradeSymbol(r.termAverage, gradingScheme)?.symbol}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                <ShieldCheck className="h-12 w-12 opacity-10" />
                                <p>Select filters and verify integrity to generate preview.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>Year Selection</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
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
                            className="w-full mt-4" 
                            onClick={() => generateYearReport(selectedYearId, yearReportGrade, yearReportSubject)}
                            disabled={yearLoading || !selectedYearId || yearReportGrade === 'all'}
                        >
                            {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Year Summary"}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3">
                    <CardHeader><CardTitle>Year Summary Preview</CardTitle></CardHeader>
                    <CardContent>
                        {yearData ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        {terms.map(t => <TableHead key={t.id} className="text-right">{t.name}</TableHead>)}
                                        <TableHead className="text-right font-bold">Final Year %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {yearData.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{r.learnerName}</TableCell>
                                            {terms.map(t => (
                                                <TableCell key={t.id} className="text-right text-muted-foreground">
                                                    {r.termMarks[t.name] ? `${r.termMarks[t.name]}%` : "-"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-primary">{r.finalYearMark}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-20 text-center text-muted-foreground">Generate to view results.</div>
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