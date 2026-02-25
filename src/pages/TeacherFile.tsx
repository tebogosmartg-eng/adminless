"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { TeacherFileCover } from '@/components/teacher-file/TeacherFileCover';
import { TeacherFileIndex } from '@/components/teacher-file/TeacherFileIndex';
import { TeacherFileTermChapter } from '@/components/teacher-file/TeacherFileTermChapter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Download, Book, FileText, CheckCircle2, Info, Loader2, CalendarDays, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { generateTeacherFilePDF } from '@/utils/pdfGenerator';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

const TeacherFile = () => {
  const { years, terms, activeYear, setActiveYear, activeTerm, setActiveTerm } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone, schoolCode, saceNumber } = useSettings();
  
  // Default to cover, but prioritize term view if a term is active and we're not on the cover
  const [activeBookSection, setActiveBookSection] = useState("cover");
  const [isExporting, setIsExporting] = useState(false);

  // Sync activeBookSection with global activeTerm when it changes, 
  // but only if we are currently in a term-based tab.
  useEffect(() => {
    if (activeTerm && activeBookSection !== 'cover' && activeBookSection !== 'index') {
        setActiveBookSection(activeTerm.id);
    }
  }, [activeTerm?.id]);

  const handlePrint = () => {
      window.print();
  };

  const handleExportAll = async () => {
      if (!activeYear) return;
      setIsExporting(true);
      try {
          await generateTeacherFilePDF(
            activeYear, 
            { 
              name: schoolName, 
              teacher: teacherName, 
              logo: schoolLogo, 
              email: contactEmail, 
              phone: contactPhone,
              schoolCode,
              saceNumber
            }
          );
          showSuccess("Full Teacher File generated successfully.");
      } catch (e) {
          showError("PDF Compilation failed.");
      } finally {
          setIsExporting(false);
      }
  };

  const handleExportChapter = async (termId: string) => {
      if (!activeYear) return;
      setIsExporting(true);
      try {
          await generateTeacherFilePDF(
            activeYear, 
            { 
              name: schoolName, 
              teacher: teacherName, 
              logo: schoolLogo, 
              email: contactEmail, 
              phone: contactPhone,
              schoolCode,
              saceNumber
            },
            termId
          );
          showSuccess("Term Chapter compiled.");
      } catch (e) {
          showError("Chapter export failed.");
      } finally {
          setIsExporting(false);
      }
  };

  const sortedTerms = useMemo(() => {
    return [...terms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [terms]);

  const handleSectionChange = (val: string) => {
      setActiveBookSection(val);
      // If user clicks a term tab, update the global academic context
      const targetTerm = sortedTerms.find(t => t.id === val);
      if (targetTerm) {
          setActiveTerm(targetTerm);
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-dashed no-print">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                <Book className="h-5 w-5" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">Teacher File — {activeTerm?.name || "Term"}</h1>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Digital Academic Portfolio</p>
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

            <div className="h-6 w-px bg-border mx-1" />

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

      {!activeTerm && activeBookSection !== 'cover' && activeBookSection !== 'index' ? (
          <div className="py-20 text-center space-y-4">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <div className="space-y-1">
                  <h3 className="text-lg font-bold">No Active Term Context</h3>
                  <p className="text-sm text-muted-foreground">Please select a term to view specific portfolio chapters.</p>
              </div>
          </div>
      ) : (
        <Tabs value={activeBookSection} onValueChange={handleSectionChange} className="w-full">
            <div className="flex flex-col items-center justify-center mb-8 no-print gap-4">
                <TabsList className="bg-muted/50 p-1 border h-10">
                    <TabsTrigger value="cover" className="gap-2 px-6 h-8">Cover</TabsTrigger>
                    <TabsTrigger value="index" className="gap-2 px-6 h-8">Index</TabsTrigger>
                    {sortedTerms.map((t, i) => {
                        const isUnlocked = i === 0 || sortedTerms[i-1].is_finalised;
                        return (
                            <TabsTrigger 
                                key={t.id} 
                                value={t.id} 
                                disabled={!isUnlocked}
                                className={cn(
                                    "gap-2 px-6 h-8",
                                    !isUnlocked && "opacity-50 grayscale"
                                )}
                            >
                                {t.name}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
                
                {activeBookSection !== 'cover' && activeBookSection !== 'index' && (
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleExportChapter(activeBookSection)} 
                            disabled={isExporting}
                            className="text-[10px] uppercase font-black text-primary hover:bg-primary/5 h-6 gap-1.5"
                        >
                            <FileText className="h-3 w-3" /> Export Just This Chapter
                        </Button>
                    </div>
                )}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <TabsContent value="cover" className="mt-0">
                    <TeacherFileLayout>
                        <TeacherFileCover year={activeYear} />
                    </TeacherFileLayout>
                </TabsContent>

                <TabsContent value="index" className="mt-0">
                    <TeacherFileLayout pageNumber={1}>
                        <TeacherFileIndex terms={terms} year={activeYear} />
                    </TeacherFileLayout>
                </TabsContent>

                {sortedTerms.map((term, i) => (
                    <TabsContent key={term.id} value={term.id} className="mt-0">
                        <TeacherFileLayout pageNumber={i + 2}>
                            <TeacherFileTermChapter term={term} />
                        </TeacherFileLayout>
                    </TabsContent>
                ))}
            </div>
        </Tabs>
      )}

      <div className="fixed bottom-6 right-6 no-print flex flex-col items-end gap-2">
          <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-2xl border max-w-xs space-y-3 animate-in slide-in-from-right-8">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Info className="h-4 w-4" />
                  Portfolio Guide
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                  Your **Teacher File** automatically organizes your academic records into a professional "Book" format for moderation.
              </p>
              <div className="pt-2 flex flex-col gap-1.5">
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 text-[10px] justify-start py-1">
                      <CheckCircle2 className="h-3 w-3 mr-2" /> Attendance Compiled
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] justify-start py-1">
                      <FileText className="h-3 w-3 mr-2" /> Marksheets Consolidated
                  </Badge>
              </div>
          </div>
      </div>
    </div>
  );
};

export default TeacherFile;