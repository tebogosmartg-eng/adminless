"use client";

import React from 'react';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    Download, 
    Loader2, 
    ShieldCheck, 
    Sparkles, 
    ChevronDown, 
    ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TeacherFileTemplateSection, TeacherFileEntry, TeacherFileEntryAttachment } from '@/lib/types';

interface ReviewDocumentProps {
  teacherName: string;
  className: string;
  grade: string;
  termName: string;
  auditStats: any;
  sections: TeacherFileTemplateSection[];
  groupedBySection: Record<string, TeacherFileEntry[]>;
  allAttachments: TeacherFileEntryAttachment[];
  collapsedSections: Set<string>;
  onToggleSection: (id: string) => void;
  loadingFileId: string | null;
  onViewFile: (path: string, id: string) => Promise<void>;
}

export const ReviewDocument = (props: ReviewDocumentProps) => {
  return (
    <TeacherFileLayout className="shadow-none border border-slate-200">
        <div className="space-y-16 py-8">
            <div className="space-y-12">
                <div className="text-center space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Academic Portfolio</h2>
                        <div className="h-1.5 w-24 bg-blue-600 rounded-full mx-auto no-print" />
                    </div>
                    <div className="grid grid-cols-3 gap-8 py-8 border-y-2 border-slate-900 max-w-2xl mx-auto">
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Educator</p>
                            <p className="text-xs font-black uppercase">{props.teacherName || "Professional"}</p>
                        </div>
                        <div className="text-center border-x-2 border-slate-100">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Context</p>
                            <p className="text-xs font-black uppercase">{props.className} ({props.grade})</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Academic Session</p>
                            <p className="text-xs font-black uppercase">{props.termName}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                    {[
                        { label: 'Active Entries', val: props.auditStats.total, icon: FileText, color: 'text-slate-900' },
                        { label: 'Attachments', val: props.auditStats.attachments, icon: Download, color: 'text-blue-600' },
                        { label: 'Portfolio Items', val: props.auditStats.portfolio, icon: Sparkles, color: 'text-green-600' },
                        { label: 'Moderation Items', val: props.auditStats.moderation, icon: ShieldCheck, color: 'text-purple-600' }
                    ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-2xl border bg-slate-50/50 flex flex-col items-center text-center gap-1">
                            <stat.icon className={cn("h-4 w-4 mb-1 opacity-40", stat.color)} />
                            <span className={cn("text-2xl font-black", stat.color)}>{stat.val}</span>
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-20">
                {props.sections.map(section => {
                    const groupEntries = props.groupedBySection[section.id] || [];
                    if (groupEntries.length === 0) return null;
                    const isCollapsed = props.collapsedSections.has(section.id);

                    return (
                        <section key={section.id} className="space-y-8">
                            <div 
                                className="border-b-4 border-slate-100 pb-2 flex items-center justify-between group/section cursor-pointer no-print"
                                onClick={() => props.onToggleSection(section.id)}
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
                            
                            {/* Static print header */}
                            <div className="hidden print:block border-b-2 border-slate-300 pb-2 mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    0{section.sort_order}. {section.title}
                                </h3>
                            </div>

                            {!isCollapsed && (
                                <div className="grid gap-12 animate-in fade-in slide-in-from-top-2 duration-300 print:gap-8">
                                    {groupEntries.map(entry => {
                                        const attachments = props.allAttachments.filter(a => a.entry_id === entry.id);
                                        return (
                                            <div key={entry.id} className="space-y-4 relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-100 print:before:bg-slate-300 print-avoid-break">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2 print:border-slate-300">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-sm font-black text-slate-900 uppercase">
                                                                {entry.title || "Observation Record"}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                {(entry.tags || []).map(tag => (
                                                                    <span key={tag} className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded print:border print:border-slate-300 print:bg-transparent print:text-black">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase print:text-slate-600">
                                                            {format(new Date(entry.created_at), 'dd MMMM yyyy')}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap italic print:text-black">
                                                        "{entry.content}"
                                                    </div>
                                                </div>

                                                {attachments.length > 0 && (
                                                    <div className="pt-2">
                                                        <div className="hidden print:block text-[9px] font-black uppercase tracking-widest text-slate-800 mb-2">
                                                            Linked Documentation
                                                        </div>
                                                        <div className="grid sm:grid-cols-2 gap-3 print:block print:space-y-1">
                                                            {attachments.map(file => (
                                                                <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 group/doc print:p-0 print:border-none print:bg-transparent">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="p-2 bg-white rounded-lg border no-print">
                                                                            <FileText className="h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-[11px] font-black truncate text-slate-900 print:text-[10px] print:text-black">
                                                                                <span className="hidden print:inline mr-2">•</span>
                                                                                {file.file_name}
                                                                            </span>
                                                                            <span className="text-[8px] font-bold text-slate-400 uppercase no-print">Linked Evidence</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 no-print" 
                                                                        onClick={() => props.onViewFile(file.file_path, file.id)}
                                                                        disabled={props.loadingFileId === file.id}
                                                                    >
                                                                        {props.loadingFileId === file.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
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
            </div>

            {/* Print Signature Section */}
            <div className="pt-20 mt-20 border-t-2 border-slate-100 grid grid-cols-2 gap-20 print-avoid-break">
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
  );
};