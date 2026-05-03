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
import { Loader2, FileDown, FileSpreadsheet, LayoutGrid, GraduationCap, Globe, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { SchoolProfile, generateTermSummaryPDF, generateYearSummaryPDF } from '@/utils/pdfGenerator';
import { checkClassTermIntegrity } from '@/utils/integrity';
import { IntegrityGuard } from '@/components/IntegrityGuard';
import { generateSASAMSExport } from '@/utils/sasams';
import { cn } from '@/lib/utils';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { t } from '@/lib/useTranslation';
import { LANGUAGES } from '@/lib/translations';
import { useLearnerAnalytics } from '@/hooks/useLearnerAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsyncState } from '@/hooks/useAsyncState';
import { AsyncStatus } from '@/components/ui/AsyncStatus';
import { PASS_THRESHOLD } from '@/constants/diagnostics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { logAdminLessError } from '@/utils/logAdminLessError';
import { isOfficialTermOrClassExport } from '@/utils/officialExport';

const ReportsTableSkeleton = ({ columns = 6, rows = 8 }: { columns?: number; rows?: number }) => (
  <div className="w-full h-full p-4 space-y-3">
    <div className="grid gap-3" style={{ gridTemplateColumns: `220px repeat(${Math.max(columns - 2, 1)}, minmax(110px, 1fr)) 120px` }}>
      {Array.from({ length: Math.max(columns, 3) }).map((_, idx) => (
        <Skeleton key={`head-${idx}`} className="h-8 w-full rounded-md" />
      ))}
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="grid gap-3"
          style={{ gridTemplateColumns: `220px repeat(${Math.max(columns - 2, 1)}, minmax(110px, 1fr)) 120px` }}
        >
          {Array.from({ length: Math.max(columns, 3) }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const ReportsContent = ({ embedded = false, defaultClassId }: { embedded?: boolean, defaultClassId?: string }) => {
  const queryClient = useQueryClient();
  const { classes } = useClasses();
  const { gradingScheme, schoolName, schoolCode, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const {
    terms,
    years,
    activeYear,
    activeTerm,
    assessments,
    marks,
    assessmentsQueryError,
    marksQueryError,
  } = useAcademic();
  const reportsContextError = assessmentsQueryError ?? marksQueryError;

  const profile: SchoolProfile = {
    name: schoolName,
    teacher: teacherName,
    logo: schoolLogo,
    email: contactEmail,
    phone: contactPhone
  };

  const { loading: termLoading, reportData: termData, generateTermReport, allAssessmentTitles } = useTermReportData();
  const { loading: yearLoading, yearData, generateYearReport } = useYearReportData();

  const defaultClass = useMemo(() => classes.find(c => c.id === defaultClassId), [classes, defaultClassId]);

  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "");
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id || "");
  const [selectedGrade, setSelectedGrade] = useState(defaultClass?.grade || "all");
  const [selectedSubject, setSelectedSubject] = useState(defaultClass?.subject || "all");
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId || "all");
  const [exportLanguage, setExportLanguage] = useState("en");
  const [isExportingTermPdf, setIsExportingTermPdf] = useState(false);
  const [isExportingYearPdf, setIsExportingYearPdf] = useState(false);
  const exportState = useAsyncState();

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
  }, [selectedGrade, selectedSubject, selectedTermId, defaultClassId]);

  const selectedTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
  const selectedLearnerId = useMemo(() => {
    const selectedClass = classes.find((classInfo) => classInfo.id === selectedClassId);
    return selectedClass?.learners[0]?.id;
  }, [classes, selectedClassId]);
  const analytics = useLearnerAnalytics({
    learnerId: selectedLearnerId,
    academicYearId: selectedYearId && selectedYearId !== 'all' ? selectedYearId : undefined,
    termId: selectedTermId && selectedTermId !== 'all' ? selectedTermId : undefined,
    classId: selectedClassId && selectedClassId !== 'all' ? selectedClassId : undefined
  });

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
    generateTermReport(selectedTermId, selectedGrade, selectedSubject, selectedClassId);
  };

  const handleGenerateYear = () => {
      if (!selectedYearId || selectedClassId === 'all') return;
      generateYearReport(selectedYearId, selectedClassId);
  };

  const handleExportTermCSV = () => {
    if (!termData || !selectedClassId) return;
    const targetClassName = classes.find(c => c.id === selectedClassId)?.className || "Class";
    const termName = selectedTerm?.name || "Term";
    const displayData = termData.filter((r) => r.classId === selectedClassId);
    const header = [t('learnerName', exportLanguage), t('class', exportLanguage), ...allAssessmentTitles, t('termAverage', exportLanguage), t('symbol', exportLanguage)].join(",");
    const rows = displayData.map(r => {
        const symbol = getGradeSymbol(r.termAverage, gradingScheme)?.symbol || "-";
        return [`"${r.learnerName}"`,`"${r.className}"`,...allAssessmentTitles.map(title => `"${r.assessments[title] || "-"}"`),r.termAverage,`"${symbol}"`].join(",");
    });
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${selectedGrade}_${selectedSubject}_${termName}_Summary.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess("CSV exported.");
  };

  const handleExportTermPDF = async () => {
    if (!termData || !selectedTermId) return;
    const termName = selectedTerm?.name || "Term Report";
    const displayData = termData.filter((r) => r.classId === selectedClassId);
    setIsExportingTermPdf(true);
    try {
      await exportState.run(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        generateTermSummaryPDF(
          displayData,
          allAssessmentTitles,
          termName,
          selectedGrade,
          selectedSubject,
          gradingScheme,
          profile,
          PASS_THRESHOLD,
          exportLanguage
        );
      }, { status: "loading", userInitiated: false });
      showSuccess("PDF generated.");
    } catch (error) {
      logAdminLessError('reports_export_term_pdf', error);
      showError("Failed to load data");
    } finally {
      setIsExportingTermPdf(false);
    }
  };

  const handleExportYearPDF = async () => {
      if (!yearData || !selectedYearId) return;
      const yearName = years.find(y => y.id === selectedYearId)?.name || "Year";
      const termNames = terms
        .filter(t => t.year_id === selectedYearId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map(t => t.name);
      setIsExportingYearPdf(true);
      try {
        await exportState.run(async () => {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
          generateYearSummaryPDF(
            yearData,
            termNames,
            yearName,
            selectedGrade,
            selectedSubject,
            profile,
            exportLanguage
          );
        }, { status: "loading", userInitiated: false });
        showSuccess("Year End PDF generated.");
      } catch (error) {
        logAdminLessError('reports_export_year_pdf', error);
        showError("Failed to load data");
      } finally {
        setIsExportingYearPdf(false);
      }
  };

  const handleSASAMSExportAction = () => {
    if (!termData || !selectedTerm || !activeYear || selectedClassId === 'all') return;
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) return;
    if (!isOfficialTermOrClassExport(selectedTerm.closed, targetClass.is_finalised)) {
      showError(
        "Export blocked: finalise this class in Class Details (Reports → Term Administration) or close the term in Settings before SA-SAMS export.",
      );
      return;
    }
    if (integrityReport && !integrityReport.isValid) { showError("Marks incomplete."); return; }

    const classRows = termData.filter((d) => d.classId === targetClass.id);
    const avgByLearnerId = new Map(classRows.map((row) => [row.learnerId, row.termAverage]));
    const exportLearners = targetClass.learners.map(l => {
        const average = l.id ? avgByLearnerId.get(l.id) : undefined;
        return { ...l, mark: average !== undefined ? average.toString() : "0" };
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
      <AsyncStatus
        state={{
          status: (isExportingTermPdf || isExportingYearPdf) ? "loading" : exportState.status,
          error: exportState.error,
          retry: exportState.retry,
        }}
      />
      {reportsContextError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load data</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">Connection issue, please retry.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit shrink-0"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ['assessments'] });
                void queryClient.invalidateQueries({ queryKey: ['assessment_marks'] });
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
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
                                      <SelectContent>
                                        {years.length === 0 && (
                                          <SelectItem value="__loading_years" disabled>
                                            Loading years...
                                          </SelectItem>
                                        )}
                                        {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                  <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Term" /></SelectTrigger>
                                      <SelectContent>
                                        {sequencedTerms.length === 0 && (
                                          <SelectItem value="__loading_terms" disabled>
                                            Loading terms...
                                          </SelectItem>
                                        )}
                                        {sequencedTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Grade / Subject</label>
                              <div className="flex flex-col gap-2 w-full">
                                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Grade" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Grades</SelectItem>
                                        {uniqueGrades.length === 0 && (
                                          <SelectItem value="__loading_grades" disabled>
                                            Loading grades...
                                          </SelectItem>
                                        )}
                                        {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {uniqueSubjects.length === 0 && (
                                          <SelectItem value="__loading_subjects" disabled>
                                            Loading subjects...
                                          </SelectItem>
                                        )}
                                        {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Specific Class</label>
                              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {availableClasses.length === 0 && (
                                      <SelectItem value="__loading_classes" disabled>
                                        Loading classes...
                                      </SelectItem>
                                    )}
                                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                                  </SelectContent>
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
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/5 border-b gap-4 min-w-0">
                        <CardTitle className="text-lg min-w-0 shrink">Class Results Summary</CardTitle>
                        <div className="flex flex-wrap gap-3 sm:gap-2 w-full sm:w-auto min-w-0 items-stretch sm:items-center">
                            {selectedLearnerId && (
                              <Badge variant="outline" className="h-auto min-h-9 max-w-full py-1.5 px-3 text-[10px] font-black uppercase tracking-wider whitespace-normal sm:whitespace-nowrap sm:max-w-[min(100%,28rem)]">
                                {analytics.isLoading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Loading trend...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    {analytics.isFetching && (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" aria-hidden />
                                    )}
                                    Trend {analytics.trend} | Avg {analytics.weightedAverage}% | N {analytics.totalAssessments}
                                  </span>
                                )}
                              </Badge>
                            )}
                            <div className="w-full min-w-0 sm:w-40 sm:flex-shrink-0 flex items-center gap-2 sm:mr-2">
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
                                    <Button variant="outline" size="sm" onClick={handleExportTermPDF} disabled={isExportingTermPdf} className="h-10 sm:h-9 gap-2 flex-1 sm:flex-none">
                                      {isExportingTermPdf ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <FileDown className="h-4 w-4 text-blue-600"/>}
                                      {isExportingTermPdf ? "Generating PDF..." : "PDF"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        {termLoading ? (
                            <ReportsTableSkeleton columns={Math.max(4, allAssessmentTitles.length + 3)} rows={8} />
                        ) : termData && isContextComplete ? (
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
                                              return r.classId === selectedClassId;
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
                                  <SelectContent>
                                    {years.length === 0 && (
                                      <SelectItem value="__loading_years" disabled>
                                        Loading years...
                                      </SelectItem>
                                    )}
                                    {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-muted-foreground">Grade / Subject</label>
                              <div className="flex flex-col gap-2 w-full">
                                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Grade" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Grades</SelectItem>
                                        {uniqueGrades.length === 0 && (
                                          <SelectItem value="__loading_grades" disabled>
                                            Loading grades...
                                          </SelectItem>
                                        )}
                                        {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {uniqueSubjects.length === 0 && (
                                          <SelectItem value="__loading_subjects" disabled>
                                            Loading subjects...
                                          </SelectItem>
                                        )}
                                        {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground">Specific Class</label>
                              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedSubject === 'all' || selectedGrade === 'all'}>
                                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {availableClasses.length === 0 && (
                                      <SelectItem value="__loading_classes" disabled>
                                        Loading classes...
                                      </SelectItem>
                                    )}
                                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <Button className="w-full mt-4 h-12 font-bold" onClick={handleGenerateYear} disabled={yearLoading || selectedClassId === 'all'}>
                              {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Consolidate Year Data"}
                          </Button>
                      </CardContent>
                  </Card>
                )}

                <Card className={`${embedded ? 'md:col-span-4' : 'md:col-span-3'} min-h-[500px] flex flex-col border-none shadow-sm overflow-hidden w-full`}>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/5 border-b gap-4 min-w-0">
                        <CardTitle className="min-w-0 shrink">Year End Consolidation</CardTitle>
                        <div className="flex flex-wrap gap-3 sm:gap-2 w-full sm:w-auto min-w-0 items-stretch sm:items-center">
                            {embedded && (
                                <Button onClick={handleGenerateYear} disabled={yearLoading || selectedClassId === 'all'} className="font-bold h-10 sm:h-9 flex-1 sm:flex-none w-full sm:w-auto">
                                    {yearLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Consolidate Year Data"}
                                </Button>
                            )}
                            {yearData && selectedClassId !== 'all' && (
                                 <Button variant="outline" size="sm" onClick={handleExportYearPDF} disabled={isExportingYearPdf} className="h-10 sm:h-9 gap-2 flex-1 sm:flex-none">
                                    {isExportingYearPdf ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <FileDown className="h-4 w-4 text-blue-600"/>}
                                    {isExportingYearPdf ? "Generating PDF..." : "Export PDF"}
                                 </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        {yearLoading ? (
                            <ReportsTableSkeleton columns={Math.max(4, sequencedTerms.length + 3)} rows={8} />
                        ) : yearData && selectedClassId !== 'all' ? (
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
                                                <Badge variant={r.finalYearMark >= PASS_THRESHOLD ? "outline" : "destructive"} className={r.finalYearMark >= PASS_THRESHOLD ? "bg-green-50 text-green-700 border-green-200" : ""}>{r.finalYearMark >= PASS_THRESHOLD ? "Pass" : "Fail"}</Badge>
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
      <div className="w-full animate-in fade-in duration-500 p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-[520px] w-full rounded-xl md:col-span-1" />
          <Skeleton className="h-[520px] w-full rounded-xl md:col-span-3" />
        </div>
      </div>
    );
  }

  return <ReportsContent />;
};

export default Reports;