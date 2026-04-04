import { useState, useEffect, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { getGradeSymbol } from '@/utils/grading';
import { useTermReportData } from '@/hooks/useTermReportData';
import { useYearReportData } from '@/hooks/useYearReportData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, FileSpreadsheet, LayoutGrid, GraduationCap, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { SchoolProfile, generateTermSummaryPDF, generateYearSummaryPDF } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';
import { generateSASAMSExport } from '@/utils/sasams';
import { cn } from '@/lib/utils';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { t } from '@/lib/useTranslation';
import { LANGUAGES } from '@/lib/translations';

const ReportsContent = ({ embedded = false, defaultClassId }: { embedded?: boolean, defaultClassId?: string }) => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const { terms, years, activeYear, activeTerm, assessments, marks } = useAcademic();

  const profile: SchoolProfile = {
    name: schoolName,
    teacher: teacherName,
    logo: schoolLogo,
    email: contactEmail,
    phone: contactPhone
  };

  const { loading: termLoading, reportData: termData, generateTermReport, allAssessmentTitles, setReportData } = useTermReportData();
  const { loading: yearLoading, yearData, generateYearReport, setYearData } = useYearReportData();

  const defaultClass = useMemo(() => classes.find(c => c.id === defaultClassId), [classes, defaultClassId]);

  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "");
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id || "");
  const [selectedGrade, setSelectedGrade] = useState(defaultClass?.grade || "all");
  const [selectedSubject, setSelectedSubject] = useState(defaultClass?.subject || "all");
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId || "all");
  const [exportLanguage, setExportLanguage] = useState("en");

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

  useEffect(() => {
      if (defaultClass) {
          setSelectedGrade(defaultClass.grade);
          setSelectedSubject(defaultClass.subject);
          setSelectedClassId(defaultClass.id);
      }
  }, [defaultClass]);

  useEffect(() => {
      if (!defaultClassId) setSelectedClassId("all");
      setReportData(null);
      setYearData(null);
  }, [selectedGrade, selectedSubject, selectedTermId, setReportData, setYearData, defaultClassId]);

  const selectedTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);

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
    const header = [t('learnerName', exportLanguage), t('class', exportLanguage), ...allAssessmentTitles, t('termAverage', exportLanguage), t('symbol', exportLanguage)].join(",");
    const rows = displayData.map(r => {
        const symbol = getGradeSymbol(r.termAverage, gradingScheme)?.symbol || "-";
        return [`"${r.learnerName}"`,`"${r.className}"`,...allAssessmentTitles.map(title => `"${r.assessments[title] || "-"}"`),r.termAverage,`"${symbol}"`].join(",");
    });
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedGrade}_${selectedSubject}_${termName}_Summary.csv`;
    link.click();
    showSuccess("CSV exported.");
  };

  const handleExportTermPDF = () => {
    if (!termData || !selectedTermId) return;
    const termName = selectedTerm?.name || "Term Report";
    const targetClassName = classes.find(c => c.id === selectedClassId)?.className;
    const displayData = termData.filter(r => r.className === targetClassName);

    generateTermSummaryPDF(
        displayData,
        allAssessmentTitles,
        termName,
        selectedGrade,
        selectedSubject,
        gradingScheme,
        profile,
        50,
        exportLanguage
    );
    showSuccess("PDF generated.");
  };

  const handleExportYearPDF = () => {
      if (!yearData || !selectedYearId) return;
      const yearName = years.find(y => y.id === selectedYearId)?.name || "Year";
      const termNames = terms
        .filter(t => t.year_id === selectedYearId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map(t => t.name);

      generateYearSummaryPDF(
          yearData,
          termNames,
          yearName,
          selectedGrade,
          selectedSubject,
          profile,
          exportLanguage
      );
      showSuccess("Year End PDF generated.");
  };

  const handleSASAMSExportAction = () => {
    if (!termData || !selectedTerm || !activeYear || selectedClassId === 'all') return;
    if (!selectedTerm.closed) { showError("Finalize term first."); return; }
    if (integrityReport && !integrityReport.isValid) { showError("Marks incomplete."); return; }
    
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) return;

    const exportLearners = targetClass.learners.map(l => {
        const match = termData.find(d => d.learnerName === l.name && d.className === targetClass.className);
        return { ...l, mark: match ? match.termAverage.toString() : "0" };
    });

    generateSASAMSExport(exportLearners, targetClass.className, targetClass.grade, selectedSubject, selectedTerm.name, activeYear.name, teacherName, schoolCode);
    showSuccess("SASAMS CSV exported.");
  };

  const sequencedTerms = useMemo(() => {
    return [...terms]
      .filter(t => t.year_id === selectedYearId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [terms, selectedYearId]);

  return (
    <div className={`space-y-6 w-full ${embedded ? 'pb-2' : 'pb-10'}`}>
      {!embedded && (
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">Analytical data is strictly caged to the selected class context.</p>
        </div>
      )}

      <Tabs defaultValue="term" className="w-full">
        <TabsList className="bg-muted/50 p-1 border flex overflow-x-auto w-full h-auto min-h-[48px] no-scrollbar justify-start flex-nowrap rounded-xl">
            <TabsTrigger value="term" className="px-4 sm:px-6 whitespace-nowrap flex-none shrink-0 h-10">Term Reports</TabsTrigger>
            <TabsTrigger value="year" className="px-4 sm:px-6 whitespace-nowrap flex-none shrink-0 h-10">Year End Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="term" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-4">
                {!embedded && (
                  <Card className="md:col-span-1 border-none shadow-sm">
                      <CardHeader>
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Class Context</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Year / Term</label>
                              <div className="flex flex-col gap-2 w-full">
                                  <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Year" /></SelectTrigger>
                                      <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Term" /></SelectTrigger>
                                      <SelectContent>{sequencedTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Grade / Subject</label>
                              <div className="flex flex-col gap-2 w-full">
                                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Grade" /></SelectTrigger>
                                      <SelectContent>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
                                      <SelectContent>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Specific Class</label>
                              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                  <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          
                          {integrityReport && <div className="pt-4 border-t"><IntegrityGuard report={integrityReport} /></div>}

                          <Button className="w-full mt-4 h-12 font-bold" onClick={handleGenerateTerm} disabled={termLoading || !isContextComplete}>
                              {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load Analytical Data"}
                          </Button>
                      </CardContent>
                  </Card>
                )}

                <Card className={`${embedded ? 'md:col-span-4' : 'md:col-span-3'} min-h-[600px] flex flex-col border-none shadow-sm overflow-hidden w-full`}>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/5 border-b gap-4">
                        <CardTitle className="text-lg">Class Results Summary</CardTitle>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                            <div className="w-40 flex items-center gap-2 mr-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <Select value={exportLanguage} onValueChange={setExportLanguage}>
                                <SelectTrigger className="h-9">
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
                            {embedded && (
                                <Button onClick={handleGenerateTerm} disabled={termLoading || !isContextComplete} className="font-bold h-10 sm:h-9 flex-1 sm:flex-none w-full sm:w-auto">
                                    {termLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load Analytical Data"}
                                </Button>
                            )}
                            {termData && isContextComplete && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleExportTermCSV} className="h-10 sm:h-9 gap-2 flex-1 sm:flex-none"><FileSpreadsheet className="h-4 w-4 text-green-600"/> CSV</Button>
                                    <Button variant="outline" size="sm" onClick={handleExportTermPDF} className="h-10 sm:h-9 gap-2 flex-1 sm:flex-none"><FileDown className="h-4 w-4 text-blue-600"/> PDF</Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        {termData && isContextComplete ? (
                            <div className="overflow-x-auto w-full h-full no-scrollbar pb-2">
                                <Table className="min-w-[800px] w-full table-fixed">
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[200px] sticky left-0 bg-muted/90 z-10 border-r shadow-sm">Learner</TableHead>
                                            {allAssessmentTitles.map(title => (
                                                <TableHead key={title} className="text-right whitespace-nowrap px-4">{title}</TableHead>
                                            ))}
                                            <TableHead className="w-[100px] text-right font-bold border-l">Term %</TableHead>
                                            <TableHead className="w-[100px] text-center border-l">Symbol</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {termData
                                          .filter(r => {
                                              const cls = classes.find(c => c.id === selectedClassId);
                                              return r.className === cls?.className;
                                          })
                                          .map((r, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30 h-12 border-b">
                                                <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate px-4">{r.learnerName}</TableCell>
                                                {allAssessmentTitles.map(title => (
                                                    <TableCell key={title} className="text-right text-sm px-4">
                                                        {r.assessments[title] || "-"}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-bold text-primary border-l text-base">{r.termAverage}%</TableCell>
                                                <TableCell className="text-center border-l">
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
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-12 text-center min-h-[300px]">
                                <LayoutGrid className="h-16 w-16 opacity-10" />
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-foreground">Awaiting Generation</h3>
                                    <p className="text-xs max-w-xs">{embedded ? "Click Load Analytical Data to view the official summary." : "Data is caged to specific class selections. Choose a class from the sidebar to view analytical results."}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-4">
                {!embedded && (
                  <Card className="md:col-span-1 border-none shadow-sm">
                      <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Yearly Context</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-muted-foreground">Academic Cycle</label>
                              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Year" /></SelectTrigger>
                                  <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-muted-foreground">Grade / Subject</label>
                              <div className="flex flex-col gap-2 w-full">
                                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Grade" /></SelectTrigger>
                                      <SelectContent>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
                                      <SelectContent>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground">Specific Class</label>
                              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                  <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <Button className="w-full mt-4 h-12 font-bold" onClick={handleGenerateYear} disabled={yearLoading || selectedClassId === 'all'}>
                              {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Consolidate Year Data"}
                          </Button>
                      </CardContent>
                  </Card>
                )}

                <Card className={`${embedded ? 'md:col-span-4' : 'md:col-span-3'} min-h-[500px] flex flex-col border-none shadow-sm overflow-hidden w-full`}>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/5 border-b gap-4">
                        <CardTitle>Year End Consolidation</CardTitle>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {embedded && (
                                <Button onClick={handleGenerateYear} disabled={yearLoading || selectedClassId === 'all'} className="font-bold h-10 sm:h-9 flex-1 sm:flex-none w-full sm:w-auto">
                                    {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Consolidate Year Data"}
                                </Button>
                            )}
                            {yearData && selectedClassId !== 'all' && (
                                 <Button variant="outline" size="sm" onClick={handleExportYearPDF} className="h-10 sm:h-9 gap-2 flex-1 sm:flex-none">
                                    <FileDown className="h-4 w-4 text-blue-600"/> Export PDF
                                 </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        {yearData && selectedClassId !== 'all' ? (
                            <div className="overflow-x-auto w-full h-full no-scrollbar pb-2">
                                <Table className="min-w-[800px] w-full table-fixed">
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[200px] sticky left-0 bg-muted/90 z-10 border-r shadow-sm">Learner Name</TableHead>
                                            {sequencedTerms.map(t => <TableHead key={t.id} className="text-right px-4">{t.name}</TableHead>)}
                                            <TableHead className="w-[120px] text-right font-bold bg-primary/5 border-l">Year Final %</TableHead>
                                            <TableHead className="w-[100px] text-center bg-primary/5 border-l">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>{yearData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30 h-12 border-b">
                                            <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate px-4">{r.learnerName}</TableCell>
                                            {sequencedTerms.map(t => (
                                                <TableCell key={t.id} className="text-right text-sm px-4">
                                                    {r.termMarks[t.name] !== null ? `${r.termMarks[t.name]}%` : "-"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-primary bg-primary/[0.02] border-l text-base">{r.finalYearMark}%</TableCell>
                                            <TableCell className="text-center bg-primary/[0.02] border-l">
                                                <Badge variant={r.finalYearMark >= 50 ? "outline" : "destructive"} className={r.finalYearMark >= 50 ? "bg-green-50 text-green-700 border-green-200" : ""}>{r.finalYearMark >= 50 ? "Pass" : "Fail"}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-12 text-center min-h-[300px]">
                                <GraduationCap className="h-16 w-16 opacity-10" />
                                <h3 className="font-semibold text-foreground">Annual Summary</h3>
                                <p className="text-xs max-w-xs">{embedded ? "Click Consolidate Year Data to generate the report." : "Consolidate all term marks into a final year-end performance report. Select a specific class to view analytical results."}</p>
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

const Reports = () => {
  const { user, authReady } = useAuthGuard();

  if (!authReady || !user) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return <ReportsContent />;
};

export default Reports;