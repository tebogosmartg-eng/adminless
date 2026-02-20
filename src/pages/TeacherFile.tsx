"use client";

import { useState } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { TeacherFileCover } from '@/components/teacher-file/TeacherFileCover';
import { TeacherFileIndex } from '@/components/teacher-file/TeacherFileIndex';
import { TeacherFileTermChapter } from '@/components/teacher-file/TeacherFileTermChapter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Download, Book, FileText, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { generateTeacherFilePDF } from '@/utils/pdfGenerator';
import { useSettings } from '@/context/SettingsContext';

const TeacherFile = () => {
  const { years, terms, activeYear, setActiveYear } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone, schoolCode, saceNumber } = useSettings();
  const [activeBookSection, setActiveBookSection] = useState("cover");
  const [isExporting, setIsExporting] = useState(false);

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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-dashed no-print">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                <Book className="h-5 w-5" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">Teacher File</h1>
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

      <Tabs value={activeBookSection} onValueChange={setActiveBookSection} className="w-full">
        <div className="flex flex-col items-center justify-center mb-8 no-print gap-4">
            <TabsList className="bg-muted/50 p-1 border h-10">
                <TabsTrigger value="cover" className="gap-2 px-6 h-8">Cover</TabsTrigger>
                <TabsTrigger value="index" className="gap-2 px-6 h-8">Index</TabsTrigger>
                {terms.map((t, i) => (
                    <TabsTrigger key={t.id} value={t.id} className="gap-2 px-6 h-8">T{i+1}</TabsTrigger>
                ))}
            </TabsList>
            
            {activeBookSection !== 'cover' && activeBookSection !== 'index' && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleExportChapter(activeBookSection)} 
                    disabled={isExporting}
                    className="text-[10px] uppercase font-black text-primary hover:bg-primary/5 h-6 gap-1.5"
                >
                    <FileText className="h-3 w-3" /> Export Just This Chapter
                </Button>
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

            {terms.map((term, i) => (
                <TabsContent key={term.id} value={term.id} className="mt-0">
                    <TeacherFileLayout pageNumber={i + 2}>
                        <TeacherFileTermChapter term={term} />
                    </TeacherFileLayout>
                </TabsContent>
            ))}
        </div>
      </Tabs>

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