"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { TeacherFileCover } from '@/components/teacher-file/TeacherFileCover';
import { TeacherFileIndex } from '@/components/teacher-file/TeacherFileIndex';
import { TeacherFileTermChapter } from '@/components/teacher-file/TeacherFileTermChapter';
import { TeacherFileFlexibleEditor } from '@/components/teacher-file/flexible/TeacherFileFlexibleEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Download, Book, FileText, CheckCircle2, Info, Loader2, CalendarDays, LayoutGrid, Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { generateTeacherFilePDF } from '@/utils/pdfGenerator';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

const TeacherFile = () => {
  const { years, terms, activeYear, setActiveYear, activeTerm, setActiveTerm } = useAcademic();
  const { classes } = useClasses();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone, schoolCode, saceNumber } = useSettings();
  
  const [activeBookSection, setActiveBookSection] = useState("cover");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activeTerm && activeBookSection !== 'cover' && activeBookSection !== 'index' && activeBookSection !== 'flexible') {
        setActiveBookSection(activeTerm.id);
    }
  }, [activeTerm?.id]);

  const handlePrint = () => window.print();

  const handleExportAll = async () => {
      if (!activeYear) return;
      setIsExporting(true);
      try {
          await generateTeacherFilePDF(
            activeYear, 
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone, schoolCode, saceNumber }
          );
          showSuccess("Full Teacher File generated successfully.");
      } catch (e) {
          showError("PDF Compilation failed.");
      } finally {
          setIsExporting(false);
      }
  };

  const sortedTerms = useMemo(() => {
    return [...terms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [terms]);

  const termClasses = useMemo(() => {
      if (!activeTerm) return [];
      return classes.filter(c => c.term_id === activeTerm.id && !c.archived);
  }, [classes, activeTerm?.id]);

  useEffect(() => {
      if (termClasses.length > 0 && selectedClassId === 'all') {
          setSelectedClassId(termClasses[0].id);
      }
  }, [termClasses, selectedClassId]);

  const handleSectionChange = (val: string) => {
      setActiveBookSection(val);
      const targetTerm = sortedTerms.find(t => t.id === val);
      if (targetTerm) setActiveTerm(targetTerm);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-dashed no-print">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                < Book className="h-5 w-5" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">Teacher File — {activeTerm?.name || "Term"}</h1>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Professional Digital Portfolio</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Cycle</span>
                <Select value={activeYear?.id || ""} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                    <SelectTrigger className="w-[180px] h-9 bg-background">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 gap-2">
                    <Printer className="h-4 w-4" /> Print
                </Button>
                <Button size="sm" onClick={handleExportAll} disabled={isExporting || !activeYear} className="h-9 gap-2 font-bold bg-blue-600 hover:bg-blue-700">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Full Book
                </Button>
            </div>
        </div>
      </div>

      <Tabs value={activeBookSection} onValueChange={handleSectionChange} className="w-full">
            <div className="flex flex-col items-center justify-center mb-8 no-print gap-6">
                <TabsList className="bg-muted/50 p-1 border h-10">
                    <TabsTrigger value="cover" className="gap-2 px-6 h-8">Cover</TabsTrigger>
                    <TabsTrigger value="index" className="gap-2 px-6 h-8">Index</TabsTrigger>
                    <TabsTrigger value="flexible" className="gap-2 px-6 h-8 bg-blue-600 text-white data-[state=active]:bg-blue-700">
                        <LayoutGrid className="h-4 w-4" /> Flexible Portfolio
                    </TabsTrigger>
                    {sortedTerms.map((t, i) => {
                        const isUnlocked = i === 0 || sortedTerms[i-1].is_finalised;
                        return (
                            <TabsTrigger 
                                key={t.id} 
                                value={t.id} 
                                disabled={!isUnlocked}
                                className={cn("gap-2 px-6 h-8", !isUnlocked && "opacity-50 grayscale")}
                            >
                                {t.name} (CAPS)
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {activeBookSection === 'flexible' && activeTerm && (
                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 px-3 text-primary">
                            <Users className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Class Context</span>
                        </div>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-[200px] h-8 font-bold border-none bg-muted/40">
                                <SelectValue placeholder="Choose Class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {termClasses.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeTerm.is_finalised && (
                            <div className="pr-4 border-l pl-4">
                                <Badge className="bg-amber-100 text-amber-800 border-none gap-1 h-6">
                                    <Lock className="h-3 w-3" /> Term Finalised
                                </Badge>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <TabsContent value="cover" className="mt-0">
                    <TeacherFileLayout><TeacherFileCover year={activeYear} /></TeacherFileLayout>
                </TabsContent>

                <TabsContent value="index" className="mt-0">
                    <TeacherFileLayout pageNumber={1}><TeacherFileIndex terms={terms} year={activeYear} /></TeacherFileLayout>
                </TabsContent>

                <TabsContent value="flexible" className="mt-0">
                    <div className="container mx-auto max-w-5xl px-8">
                        {activeTerm && selectedClassId !== 'all' ? (
                            <TeacherFileFlexibleEditor 
                                classId={selectedClassId} 
                                termId={activeTerm.id} 
                                isLocked={activeTerm.is_finalised} 
                            />
                        ) : (
                            <div className="py-24 text-center space-y-4">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                                <p className="text-sm font-medium text-muted-foreground">Select a class above to manage its flexible portfolio.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {sortedTerms.map((term, i) => (
                    <TabsContent key={term.id} value={term.id} className="mt-0">
                        <TeacherFileLayout pageNumber={i + 2}><TeacherFileTermChapter term={term} /></TeacherFileLayout>
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    </div>
  );
};

export default TeacherFile;