"use client";

import { useState, useEffect } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Book, LayoutDashboard, Printer, Layers, Loader2 } from 'lucide-react';
import { TeacherFileView } from '@/components/teacher-file/TeacherFileView';
import { Button } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/useAuthGuard';

const TeacherFileContent = () => {
  const { years, terms, activeYear, setActiveYear, activeTerm, setActiveTerm } = useAcademic();
  const { classes } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const termClasses = classes.filter(c => c.term_id === activeTerm?.id && !c.archived);

  useEffect(() => {
      if (termClasses.length > 0) {
          if (selectedClassId !== 'all' && !termClasses.find(c => c.id === selectedClassId)) {
              setSelectedClassId(termClasses[0].id);
          }
      } else {
          setSelectedClassId("");
      }
  }, [activeTerm?.id, classes]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 bg-white dark:bg-card p-6 rounded-xl border shadow-sm no-print">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><Book className="h-6 w-6" /></div>
           <div>
               <h1 className="text-2xl font-bold tracking-tight">Teacher File</h1>
               <p className="text-sm text-muted-foreground">Auto-assembled academic portfolio constrained by term context.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Academic Year</Label>
                <Select value={activeYear?.id || ""} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Term</Label>
                <Select value={activeTerm?.id || ""} onValueChange={(val) => setActiveTerm(terms.find(t => t.id === val) || null)} disabled={!activeYear}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Term" /></SelectTrigger>
                    <SelectContent>
                        {terms.filter(t => t.year_id === activeYear?.id)
                             .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                             .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Class Allocation</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!activeTerm || termClasses.length === 0}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                        {termClasses.length > 1 && (
                            <SelectItem value="all" className="font-bold text-primary bg-primary/5">
                                -- All Active Classes (Bulk Mode) --
                            </SelectItem>
                        )}
                        {termClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className} ({c.subject})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {activeYear && activeTerm && selectedClassId === 'all' ? (
          <div className="space-y-16 animate-in fade-in duration-500">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 no-print shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-full text-white">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-blue-900 dark:text-blue-300">Bulk Portfolio Mode Active</h3>
                          <p className="text-xs text-blue-800 dark:text-blue-400">Generating {termClasses.length} distinct class portfolios for printing.</p>
                      </div>
                  </div>
                  <Button className="gap-2 shadow-lg h-12 px-8 font-black w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" /> Print All {termClasses.length} Portfolios
                  </Button>
              </div>

              <div className="space-y-32">
                  {termClasses.map((cls, index) => (
                      <div key={cls.id} className={index > 0 ? "print-page-break border-t-4 border-dashed border-slate-200 pt-16" : ""}>
                          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500 no-print">
                              File {index + 1} of {termClasses.length}: {cls.className}
                          </div>
                          <TeacherFileView year={activeYear} term={activeTerm} classId={cls.id} isBulkMode />
                      </div>
                  ))}
              </div>
          </div>
      ) : activeYear && activeTerm && selectedClassId ? (
          <TeacherFileView year={activeYear} term={activeTerm} classId={selectedClassId} />
      ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
              <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-semibold text-foreground text-lg">Awaiting Context Selection</p>
              <p className="text-sm max-w-sm mt-2 leading-relaxed">
                  Please select an Academic Year, Term, and specific Class above to auto-assemble your Teacher File.
              </p>
          </div>
      )}
    </div>
  );
}

const TeacherFile = () => {
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

  return <TeacherFileContent />;
}

export default TeacherFile;