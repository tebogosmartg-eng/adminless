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
    Circle
} from 'lucide-react';
import { TermCompletionSummary } from './TermCompletionSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export const TeacherFileIndex = ({ terms, year }: { terms: Term[], year: AcademicYear | null }) => {
  const annotations = useLiveQuery(() => 
    year ? db.teacher_file_annotations.where('academic_year_id').equals(year.id).toArray() : []
  , [year?.id]) || [];

  const attachments = useLiveQuery(() => 
    year ? db.teacher_file_attachments.where('academic_year_id').equals(year.id).toArray() : []
  , [year?.id]) || [];

  const sections = [
    { num: "1", key: "personal_details", title: "Personal details", icon: User },
    { num: "2", key: "timetable", title: "Timetable", icon: CalendarDays },
    { num: "3", key: "subject_policy", title: "Subject Policy and Support Documents", icon: ShieldCheck },
    { num: "4", key: "planning", title: "Planning", icon: BookText, sub: ["4.1 ATP", "4.2 Lesson Plan", "4.3 File Control sheets A & B"] },
    { num: "5", key: "assessment", title: "Assessment", icon: GraduationCap, sub: ["5.1 POA", "5.2 Formal Assessment Tasks", "5.3 Memoranda", "5.4 Moderation", "5.5 Record sheets", "5.6 Subject Improvement Plan"] },
    { num: "6", key: "educator_reports", title: "Educator Reports", icon: FileText },
    { num: "7", key: "textbook_records", title: "Textbook / LTSMs control records", icon: Users },
    { num: "8", key: "meeting_minutes", title: "Subject Meeting Minutes", icon: ClipboardList },
    { num: "9", key: "iqms", title: "IQMS", icon: Settings },
    { num: "10", key: "correspondence", title: "Correspondence", icon: Mail },
  ];

  const getSectionStatus = (key: string) => {
    const hasComment = annotations.some(a => a.section_key.startsWith(key) && a.content.trim());
    const hasFiles = attachments.some(a => a.section_key === key);
    // Special handling for data-driven sections like personal_details or timetable
    if (key === 'personal_details' || key === 'timetable') return true;
    return hasComment || hasFiles;
  };

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
                                    <span className="text-sm font-black text-slate-700">{s.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5 text-slate-200" />}
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Term Readiness Summary</h3>
            <div className="grid gap-4 no-print">
                {year && terms.map((t) => (
                    <TermCompletionSummary 
                        key={t.id} 
                        termId={t.id} 
                        yearId={year.id} 
                        termName={t.name}
                        isFinalised={t.is_finalised}
                    />
                ))}
            </div>
            
            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="h-24 w-24" />
                </div>
                <div className="space-y-2 relative z-10">
                    <h4 className="text-xl font-black text-white">Full Book Compliance</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        The Digital Teacher File serves as your primary evidence of professional academic management. 
                        Ensure all 10 core sections contain either professional commentary or verified document uploads.
                    </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center gap-3 relative z-10">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Audit Validation Active</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};