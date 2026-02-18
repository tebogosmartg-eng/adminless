"use client";

import React from 'react';
import { Term, AcademicYear } from '@/lib/types';
import { 
    User, 
    CalendarDays, 
    ShieldCheck, 
    BookText, 
    GraduationCap, 
    FileText, 
    ClipboardList, 
    Users,
    Settings,
    Mail,
    CheckCircle2,
    Circle,
    AlertTriangle,
    ShieldAlert,
    Info
} from 'lucide-react';
import { TermCompletionSummary } from './TermCompletionSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { cn } from '@/lib/utils';

export const TeacherFileIndex = ({ terms, year }: { terms: Term[], year: AcademicYear | null }) => {
  const annotations = useLiveQuery(() => 
    year ? db.teacher_file_annotations.where('academic_year_id').equals(year.id).toArray() : []
  , [year?.id]) || [];

  const attachments = useLiveQuery(() => 
    year ? db.teacher_file_attachments.where('academic_year_id').equals(year.id).toArray() : []
  , [year?.id]) || [];

  const sections = [
    { num: "1", key: "personal_details", title: "Personal details", icon: User, required: true },
    { num: "2", key: "timetable", title: "Timetable", icon: CalendarDays, required: true },
    { num: "3", key: "subject_policy", title: "Subject Policy and Support Documents", icon: ShieldCheck, required: true },
    { num: "4", key: "planning", title: "Planning", icon: BookText, required: true, sub: ["4.1 ATP", "4.2 Lesson Plan", "4.3 File Control sheets A & B"] },
    { num: "5", key: "assessment", title: "Assessment", icon: GraduationCap, required: true, sub: ["5.1 POA", "5.2 Formal Assessment Tasks", "5.3 Memoranda", "5.4 Moderation", "5.5 Record sheets", "5.6 Subject Improvement Plan"] },
    { num: "6", key: "educator_reports", title: "Educator Reports", icon: FileText, required: false },
    { num: "7", key: "textbook_records", title: "Textbook / LTSMs control records", icon: Users, required: false },
    { num: "8", key: "meeting_minutes", title: "Subject Meeting Minutes", icon: ClipboardList, required: true },
    { num: "9", key: "iqms", title: "IQMS", icon: Settings, required: true },
    { num: "10", key: "correspondence", title: "Correspondence", icon: Mail, required: false },
  ];

  const getSectionStatus = (key: string) => {
    const hasComment = annotations.some(a => a.section_key.startsWith(key) && a.content.trim());
    const hasFiles = attachments.some(a => a.section_key === key);
    if (key === 'personal_details' || key === 'timetable') return true;
    return hasComment || hasFiles;
  };

  const missingMandatory = sections.filter(s => s.required && !getSectionStatus(s.key));

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h2 className="text-4xl font-black tracking-tight text-slate-900">Contents Page</h2>
        <div className="h-1.5 w-24 bg-blue-600 rounded-full" />
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consolidated Academic Index</h3>
            <div className="grid gap-3">
                {sections.map((s) => {
                    const isDone = getSectionStatus(s.key);
                    return (
                        <div key={s.num} className="space-y-1">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 group">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-blue-600 font-bold w-4">{s.num}.</span>
                                    <span className={cn(
                                        "text-sm font-black transition-colors",
                                        isDone ? "text-slate-700" : "text-slate-400"
                                    )}>{s.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : s.required ? <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> : <Circle className="h-3.5 w-3.5 text-slate-200" />}
                                    <s.icon className="h-3 w-3 text-slate-300" />
                                </div>
                            </div>
                            {s.sub && (
                                <div className="pl-12 grid gap-1 py-1">
                                    {s.sub.map(sub => (
                                        <div key={sub} className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                            {sub}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Moderation Readiness Audit</h3>
            
            {missingMandatory.length > 0 ? (
                <div className="p-6 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-3 text-amber-700 font-black text-xs uppercase tracking-widest">
                        <AlertTriangle className="h-5 w-5" />
                        Portfolio Action Required
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        The following mandatory sections are currently empty. A professional Teacher File must contain evidence for these categories before moderation.
                    </p>
                    <div className="grid gap-2">
                        {missingMandatory.map(s => (
                            <div key={s.key} className="flex items-center gap-2 text-[11px] font-bold text-amber-900 bg-white/50 p-2 rounded border border-amber-100">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Section {s.num}: {s.title}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-2xl border-2 border-green-200 bg-green-50/30 space-y-4">
                    <div className="flex items-center gap-3 text-green-700 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck className="h-5 w-5" />
                        Audit Validated
                    </div>
                    <p className="text-xs text-green-800 leading-relaxed font-medium">
                        All mandatory academic and administrative sections contain verified data or professional commentary. Your file is ready for formal moderation.
                    </p>
                </div>
            )}

            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="h-24 w-24" />
                </div>
                <div className="space-y-2 relative z-10">
                    <h4 className="text-xl font-black text-white">Full Book Compliance</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Your Digital Teacher File is automatically formatted to CAPS standards. Use the "Export Full Book" button to generate a single consolidated PDF for your school records.
                    </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Live Audit</span>
                    </div>
                    <Info className="h-4 w-4 text-slate-700 hover:text-blue-400 cursor-pointer transition-colors" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};