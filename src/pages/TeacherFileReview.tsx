"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeacherFileFlexible } from '@/hooks/useTeacherFileFlexible';
import { useReviewSnapshots } from '@/hooks/useReviewSnapshots';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    Loader2,
    Camera,
    Save,
    History,
    X,
    Sparkles,
    Download,
    CheckCircle2,
    LayoutGrid,
    Eye,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { getSignedFileUrl } from '@/services/storage';
import { showError, showSuccess } from '@/utils/toast';
import { generateReviewPackPDF } from '@/utils/pdfGenerator';

const TeacherFileReview = () => {
  const { classId, termId } = useParams();
  const navigate = useNavigate();
  const { classes } = useClasses();
  const { activeTerm } = useAcademic();
  const { teacherName, schoolName, schoolLogo, contactEmail, contactPhone } = useSettings();
  
  const { sections, entries, loading } = useTeacherFileFlexible(classId!, termId!);
  const { snapshots, createSnapshot, deleteSnapshot } = useReviewSnapshots(classId!, termId!);
  
  const [search, setSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [portfolioOnly, setPortfolioOnly] = useState(true);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  
  const [isBuildingSnapshot, setIsBuildingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const currentClass = classes.find(c => c.id === classId);

  // Fetch all attachments for filtered entries
  const entryIds = useMemo(() => entries.map(e => e.id), [entries]);
  const allAttachments = useLiveQuery(
    () => db.teacherfile_entry_attachments.where('entry_id').anyOf(entryIds).toArray(),
    [entryIds]
  ) || [];

  const filteredEntries = useMemo(() => {
    let list = entries;
    
    if (activeSnapshotId) {
        const snap = snapshots.find(s => s.id === activeSnapshotId);
        if (snap) {
            list = entries.filter(e => snap.entry_ids.includes(e.id));
            return list;
        }
    }

    return list.filter(e => {
        const matchesSearch = !search || 
            (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (e.content || "").toLowerCase().includes(search.toLowerCase());
        
        const matchesSection = selectedSectionId === 'all' || e.section_id === selectedSectionId;
        const matchesPortfolio = !portfolioOnly || e.visibility === 'portfolio';

        return matchesSearch && matchesSection && matchesPortfolio;
    });
  }, [entries, search, selectedSectionId, portfolioOnly, activeSnapshotId, snapshots]);

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

  const auditStats = useMemo(() => {
      return {
          total: filteredEntries.length,
          attachments: allAttachments.filter(a => filteredEntries.some(e => e.id === a.entry_id)).length,
          moderation: filteredEntries.filter(e => e.visibility === 'moderation').length,
          portfolio: filteredEntries.filter(e => e.visibility === 'portfolio').length
      };
  }, [filteredEntries, allAttachments]);

  const handleExportPDF = async () => {
    if (!currentClass || !activeTerm) return;
    setIsExporting(true);
    try {
        const packName = activeSnapshotId 
            ? snapshots.find(s => s.id === activeSnapshotId)?.name || "Snapshot"
            : "Live Review Pack";

        await generateReviewPackPDF(
            packName,
            { className: currentClass.className, subject: currentClass.subject, grade: currentClass.grade },
            activeTerm.name,
            filteredEntries,
            allAttachments,
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone }
        );
        showSuccess("Portfolio pack exported to PDF.");
    } catch (e) {
        showError("PDF Generation failed.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleViewFile = async (path: string, id: string) => {
    setLoadingFileId(id);
    try {
      const url = await getSignedFileUrl(path);
      window.open(url, '_blank', 'noreferrer');
    } catch (e) {
      showError("Failed to open secure link.");
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleSaveSnapshot = async () => {
      if (!snapshotName.trim()) return;
      await createSnapshot(
          snapshotName.trim(), 
          filteredEntries.map(e => e.id), 
          { search, selectedSectionId, portfolioOnly }
      );
      setSnapshotName("");
      setIsBuildingSnapshot(false);
  };

  const toggleSection = (id: string) => {
      const next = new Set(collapsedSections);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCollapsedSections(next);
  };

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
      {/* Navigation Header */}
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
            {activeSnapshotId && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none gap-2 h-8 px-4 font-black uppercase text-[10px]">
                    <History className="h-3 w-3" /> Snapshot: {snapshots.find(s => s.id === activeSnapshotId)?.name}
                    <button onClick={() => setActiveSnapshotId(null)} className="ml-2 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
            )}
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-[9px] font-black uppercase tracking-tighter">
                <ShieldCheck className="h-3 w-3" />
                Read-Only Audit View
            </div>
            <Button onClick={handleExportPDF} disabled={isExporting} className="h-9 gap-2 font-bold bg-blue-600 hover:bg-blue-700">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Audit PDF
            </Button>
        </div>
      </div>

      <div className="container mx-auto py-12 flex flex-col lg:flex-row gap-12 max-w-7xl px-8">
        {/* Sidebar: Filters & Snapshots */}
        <aside className="w-full lg:w-72 space-y-8 no-print">
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Review Curation</h3>
                
                <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Search Content</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            disabled={!!activeSnapshotId}
                            className="h-9 pl-8 text-xs bg-white" 
                            placeholder="Keywords..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Section Scope</Label>
                    <div className="grid gap-1">
                        <button 
                            disabled={!!activeSnapshotId}
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
                                disabled={!!activeSnapshotId}
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
                            disabled={!!activeSnapshotId}
                            checked={portfolioOnly} 
                            onChange={e => setPortfolioOnly(e.target.checked)}
                            className="h-4 w-4 accent-green-600"
                        />
                    </div>
                </div>

                {!activeSnapshotId && (
                    <div className="pt-6">
                        {isBuildingSnapshot ? (
                            <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in zoom-in duration-300">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Snapshot Name</Label>
                                <Input 
                                    value={snapshotName} 
                                    onChange={e => setSnapshotName(e.target.value)} 
                                    className="h-8 text-xs"
                                    placeholder="e.g. Term 3 Moderation Set"
                                    autoFocus
                                />
                                <div className="flex gap-1 pt-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-black flex-1" onClick={() => setIsBuildingSnapshot(false)}>Cancel</Button>
                                    <Button size="sm" className="h-7 text-[9px] uppercase font-black flex-1" onClick={handleSaveSnapshot} disabled={!snapshotName.trim()}>Save Set</Button>
                                </div>
                            </div>
                        ) : (
                            <Button 
                                variant="outline" 
                                className="w-full h-10 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 font-black text-[10px] uppercase tracking-widest gap-2"
                                onClick={() => setIsBuildingSnapshot(true)}
                            >
                                <Sparkles className="h-3 w-3" /> Build Review Pack
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Snapshot List */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <History className="h-3 w-3" /> Saved Review Sets
                </h3>
                <div className="grid gap-2">
                    {snapshots.map(snap => (
                        <div key={snap.id} className={cn(
                            "group p-3 rounded-xl border transition-all flex flex-col gap-2",
                            activeSnapshotId === snap.id ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "bg-white hover:border-slate-300"
                        )}>
                            <div className="flex justify-between items-start">
                                <button 
                                    onClick={() => setActiveSnapshotId(snap.id)}
                                    className="flex-1 text-left"
                                >
                                    <p className="text-xs font-black text-slate-900 leading-tight truncate">{snap.name}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold">{snap.entry_ids.length} entries</p>
                                </button>
                                <button 
                                    onClick={() => deleteSnapshot(snap.id)}
                                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {snapshots.length === 0 && (
                        <p className="text-[9px] text-muted-foreground italic text-center py-4">No snapshots created.</p>
                    )}
                </div>
            </div>
        </aside>

        {/* Main Content: Document Style */}
        <main className="flex-1">
            <TeacherFileLayout className="shadow-none border border-slate-200">
                <div className="space-y-16 py-8">
                    {/* Header Summary Table */}
                    <div className="space-y-12">
                        <div className="text-center space-y-6">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Academic Portfolio</h2>
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

                        {/* Audit Summary Card */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Active Entries', val: auditStats.total, icon: FileText, color: 'text-slate-900' },
                                { label: 'Attachments', val: auditStats.attachments, icon: Download, color: 'text-blue-600' },
                                { label: 'Portfolio Items', val: auditStats.portfolio, icon: Sparkles, color: 'text-green-600' },
                                { label: 'Moderation Items', val: auditStats.moderation, icon: ShieldCheck, color: 'text-purple-600' }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 rounded-2xl border bg-slate-50/50 flex flex-col items-center text-center gap-1">
                                    <stat.icon className={cn("h-4 w-4 mb-1 opacity-40", stat.color)} />
                                    <span className={cn("text-2xl font-black", stat.color)}>{stat.val}</span>
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-20">
                        {sections.map(section => {
                            const groupEntries = groupedBySection[section.id] || [];
                            if (groupEntries.length === 0) return null;
                            const isCollapsed = collapsedSections.has(section.id);

                            return (
                                <section key={section.id} className="space-y-8">
                                    <div 
                                        className="border-b-4 border-slate-100 pb-2 flex items-center justify-between group/section cursor-pointer no-print"
                                        onClick={() => toggleSection(section.id)}
                                    >
                                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                            <span className="text-blue-600">0{section.sort_order}.</span>
                                            {section.title}
                                            <Badge variant="outline" className="ml-2 h-5 text-[10px] font-bold border-slate-200">{groupEntries.length} entries</Badge>
                                        </h3>
                                        <div className="text-slate-300 group-hover/section:text-primary transition-colors">
                                            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                                        </div>
                                    </div>
                                    
                                    {/* Print-only static header */}
                                    <div className="hidden print:block border-b-4 border-slate-100 pb-2">
                                        <h3 className="text-xl font-black text-slate-900">
                                            0{section.sort_order}. {section.title}
                                        </h3>
                                    </div>

                                    {!isCollapsed && (
                                        <div className="grid gap-12 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {groupEntries.map(entry => {
                                                const attachments = allAttachments.filter(a => a.entry_id === entry.id);
                                                return (
                                                    <div key={entry.id} className="space-y-6 relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-100">
                                                        <div className="space-y-4">
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

                                                        {attachments.length > 0 && (
                                                            <div className="grid sm:grid-cols-2 gap-3 pl-4">
                                                                {attachments.map(file => (
                                                                    <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 group/doc">
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className="p-2 bg-white rounded-lg border">
                                                                                <FileText className="h-4 w-4 text-slate-400" />
                                                                            </div>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="text-[11px] font-black truncate text-slate-900">{file.file_name}</span>
                                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">Linked Evidence</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 no-print" 
                                                                            onClick={() => handleViewFile(file.file_path, file.id)}
                                                                            disabled={loadingFileId === file.id}
                                                                        >
                                                                            {loadingFileId === file.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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