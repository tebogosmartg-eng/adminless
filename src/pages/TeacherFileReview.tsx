"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeacherFileFlexible } from '@/hooks/useTeacherFileFlexible';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ArrowLeft, 
    ShieldCheck, 
    Printer, 
    Filter, 
    Search,
    BookOpen,
    Users,
    Calendar,
    Tag as TagIcon,
    ChevronDown,
    ChevronUp,
    FileText,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TeacherFileReview = () => {
  const { classId, termId } = useParams();
  const navigate = useNavigate();
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();
  const { teacherName } = useSettings();
  
  const { sections, entries, loading } = useTeacherFileFlexible(classId!, termId!);
  
  const [search, setSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [portfolioOnly, setPortfolioOnly] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const currentClass = classes.find(c => c.id === classId);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
        const matchesSearch = !search || 
            (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (e.content || "").toLowerCase().includes(search.toLowerCase());
        
        const matchesSection = selectedSectionId === 'all' || e.section_id === selectedSectionId;
        const matchesPortfolio = !portfolioOnly || e.visibility === 'portfolio';

        return matchesSearch && matchesSection && matchesPortfolio;
    });
  }, [entries, search, selectedSectionId, portfolioOnly]);

  const groupedBySection = useMemo(() => {
      const groups: Record<string, typeof filteredEntries> = {};
      sections.forEach(s => {
          const sectionEntries = filteredEntries.filter(e => e.section_id === s.id);
          if (sectionEntries.length > 0) {
              groups[s.id] = sectionEntries;
          }
      });
      return groups;
  }, [sections, filteredEntries]);

  const handlePrint = () => window.print();

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Compiling Review Portfolio...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black/90 pb-20">
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b px-8 h-16 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Portfolio Review Mode</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{currentClass?.className} • {activeTerm?.name}</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-[9px] font-black uppercase tracking-tighter">
                <ShieldCheck className="h-3 w-3" />
                Read-Only Audit View
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 gap-2 font-bold">
                <Printer className="h-4 w-4" /> Print / Export PDF
            </Button>
        </div>
      </div>

      <div className="container mx-auto py-12 flex flex-col lg:flex-row gap-12 max-w-7xl px-8">
        {/* Sidebar: Filters */}
        <aside className="w-full lg:w-72 space-y-6 no-print">
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Content Filters</h3>
                
                <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Search Content</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="h-9 pl-8 text-xs" 
                            placeholder="Keywords..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Section Scope</Label>
                    <div className="grid gap-1">
                        <button 
                            onClick={() => setSelectedSectionId('all')}
                            className={cn(
                                "text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                                selectedSectionId === 'all' ? "bg-primary text-white" : "bg-white hover:bg-slate-100 border"
                            )}
                        >
                            All Sections
                        </button>
                        {sections.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => setSelectedSectionId(s.id)}
                                className={cn(
                                    "text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors truncate",
                                    selectedSectionId === s.id ? "bg-primary text-white" : "bg-white hover:bg-slate-100 border"
                                )}
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Portfolio Only</Label>
                        <input 
                            type="checkbox" 
                            checked={portfolioOnly} 
                            onChange={e => setPortfolioOnly(e.target.checked)}
                            className="h-4 w-4 accent-green-600"
                        />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                        Only items explicitly marked as "Include in Review" will be displayed when this filter is active.
                    </p>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 space-y-2">
                <div className="flex items-center gap-2 font-black text-[10px] uppercase">
                    <BookOpen className="h-3 w-3" /> Portfolio Stats
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                        <p className="text-lg font-black">{entries.length}</p>
                        <p className="text-[8px] uppercase font-bold opacity-60">Total Entries</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black text-green-600">{entries.filter(e => e.visibility === 'portfolio').length}</p>
                        <p className="text-[8px] uppercase font-bold opacity-60 text-green-700">Curation</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* Main Content: Document Style */}
        <main className="flex-1">
            <TeacherFileLayout className="shadow-none border border-slate-200">
                <div className="space-y-16 py-8">
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">ACADEMIC PORTFOLIO</h2>
                            <div className="h-1.5 w-24 bg-blue-600 rounded-full mx-auto" />
                        </div>
                        <div className="grid grid-cols-3 gap-8 py-8 border-y-2 border-slate-900 max-w-2xl mx-auto">
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Educator</p>
                                <p className="text-xs font-black uppercase">{teacherName || "Professional"}</p>
                            </div>
                            <div className="text-center border-x-2 border-slate-100">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Context</p>
                                <p className="text-xs font-black uppercase">{currentClass?.className} ({currentClass?.grade})</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Academic Session</p>
                                <p className="text-xs font-black uppercase">{activeTerm?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Groups */}
                    <div className="space-y-20">
                        {sections.map(section => {
                            const groupEntries = groupedBySection[section.id] || [];
                            if (groupEntries.length === 0) return null;

                            return (
                                <section key={section.id} className="space-y-8">
                                    <div className="border-b-4 border-slate-100 pb-2">
                                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                            <span className="text-blue-600">0{section.sort_order}.</span>
                                            {section.title}
                                        </h3>
                                    </div>

                                    <div className="grid gap-8">
                                        {groupEntries.map(entry => (
                                            <div key={entry.id} className="space-y-4 relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-black text-slate-900 uppercase">
                                                            {entry.title || "Observation Record"}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {(entry.tags || []).map(tag => (
                                                                <span key={tag} className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {format(new Date(entry.created_at), 'dd MMMM yyyy')}
                                                    </span>
                                                </div>

                                                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap italic pl-4 border-l-2 border-slate-50">
                                                    "{entry.content}"
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}

                        {filteredEntries.length === 0 && (
                            <div className="py-20 text-center text-slate-400 italic">
                                No entries match the current curation filters.
                            </div>
                        )}
                    </div>

                    {/* Footer Sign-off (Professional) */}
                    <div className="pt-20 mt-20 border-t-2 border-slate-100 grid grid-cols-2 gap-20">
                        <div className="space-y-4">
                            <div className="h-px w-full bg-slate-900" />
                            <p className="text-[10px] font-black uppercase text-slate-400">Educator Signature & Date</p>
                        </div>
                        <div className="space-y-4">
                            <div className="h-px w-full bg-slate-900" />
                            <p className="text-[10px] font-black uppercase text-slate-400">Moderator / Head of Department</p>
                        </div>
                    </div>
                </div>
            </TeacherFileLayout>
        </main>
      </div>
    </div>
  );
};

export default TeacherFileReview;