"use client";

import React from 'react';
import { Term, AcademicYear } from '@/lib/types';
import { ListChecks, BookText, GraduationCap, ClipboardList, ShieldCheck } from 'lucide-react';
import { TermCompletionSummary } from './TermCompletionSummary';

export const TeacherFileIndex = ({ terms, year }: { terms: Term[], year: AcademicYear | null }) => {
  const sections = [
    { title: "Personal Information", icon: ListChecks, page: "1" },
    { title: "Academic Routine & Timetable", icon: ClipboardList, page: "2" },
    { title: "Curriculum Planning & Work Schedules", icon: BookText, page: "3" },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight">Table of Contents</h2>
        <div className="h-1 w-20 bg-blue-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Administrative Documentation</h3>
                <div className="grid gap-2">
                    {sections.map((s, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 group">
                            <div className="flex items-center gap-4">
                                <s.icon className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-bold text-slate-700">{s.title}</span>
                            </div>
                            <span className="text-xs font-mono text-slate-300">SEC 0{i+1}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 mt-12 no-print">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-sm">Audit Compliance Notice</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                    This document is a consolidated digital record of all marks, attendance registers, and curriculum coverage recorded during this academic cycle. All data is time-stamped and mapped to official DBE contexts.
                </p>
            </div>
        </div>

        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portfolio Completion Tracking</h3>
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
            
            <div className="hidden print:block space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Section B: Term-Based Records</h3>
                <div className="grid gap-2">
                    {terms.map((t, i) => (
                        <div key={t.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <div className="flex items-center gap-4">
                                <GraduationCap className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-bold text-slate-700">{t.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-300 uppercase italic">Assessment & Attendance</span>
                                <span className="text-xs font-mono text-slate-300">CH {i+1}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};