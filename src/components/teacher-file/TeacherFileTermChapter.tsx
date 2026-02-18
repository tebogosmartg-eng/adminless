"use client";

import React from 'react';
import { Term } from '@/lib/types';
import { LayoutDashboard, FileBarChart, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const TeacherFileTermChapter = ({ term }: { term: Term }) => {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
        <div className="space-y-1">
            <h2 className="text-5xl font-black tracking-tighter">{term.name.toUpperCase()}</h2>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em]">Consolidated Academic Record</p>
        </div>
        <div className="text-right">
            <Badge variant={term.is_finalised ? "default" : "outline"} className={term.is_finalised ? "bg-green-600" : ""}>
                {term.is_finalised ? "FINALIZED RECORD" : "WORKING DRAFT"}
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="p-6 rounded-2xl border bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-lg">Class Registers</h3>
                </div>
                <div className="space-y-2 opacity-50">
                    <div className="h-2 w-full bg-slate-200 rounded" />
                    <div className="h-2 w-3/4 bg-slate-200 rounded" />
                    <div className="h-2 w-5/6 bg-slate-200 rounded" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">Monthly consolidated registers will appear here.</p>
            </div>

            <div className="p-6 rounded-2xl border bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-purple-600" />
                    <h3 className="font-bold text-lg">Work Covered Logs</h3>
                </div>
                <div className="space-y-2 opacity-50">
                    <div className="h-2 w-full bg-slate-200 rounded" />
                    <div className="h-2 w-full bg-slate-200 rounded" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">Curriculum journal entries for this period.</p>
            </div>
        </div>

        <div className="space-y-6">
             <div className="p-6 rounded-2xl border bg-slate-50/50 space-y-4 h-full">
                <div className="flex items-center gap-2">
                    <FileBarChart className="h-5 w-5 text-green-600" />
                    <h3 className="font-bold text-lg">Official Marksheets</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold border-b pb-2 text-slate-400">
                        <span>LEARNER</span>
                        <span>FINAL %</span>
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-1">
                            <div className="h-3 w-32 bg-slate-100 rounded" />
                            <div className="h-3 w-8 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-auto">Summarized analytical data for term end.</p>
            </div>
        </div>
      </div>
      
      <div className="pt-20">
          <div className="flex justify-center gap-20">
              <div className="flex flex-col items-center">
                  <div className="h-px w-48 bg-slate-300" />
                  <span className="text-[9px] font-bold text-slate-400 mt-2">Teacher Signature</span>
              </div>
              <div className="flex flex-col items-center">
                  <div className="h-px w-48 bg-slate-300" />
                  <span className="text-[9px] font-bold text-slate-400 mt-2">HOD Signature / Stamp</span>
              </div>
          </div>
      </div>
    </div>
  );
};