"use client";

import React from 'react';
import { Term } from '@/lib/types';
import { 
    LayoutDashboard, 
    FileBarChart, 
    History, 
    ShieldCheck, 
    AlertCircle, 
    Loader2,
    Calendar,
    Target,
    Users,
    BrainCircuit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTeacherFileTermData } from '@/hooks/useTeacherFileTermData';
import { TeacherFileAnnotation } from './TeacherFileAnnotation';
import { format } from 'date-fns';

export const TeacherFileTermChapter = ({ term }: { term: Term }) => {
  const { data, loading } = useTeacherFileTermData(term.id, term.year_id);

  if (loading) {
      return (
          <div className="h-[200mm] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Compiling Term Records...</p>
          </div>
      );
  }

  if (!data || data.empty) {
      return (
          <div className="h-[200mm] flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-muted p-6 rounded-full">
                  <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
              </div>
              <div className="space-y-1">
                  <h3 className="text-xl font-bold">No Data for {term.name}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Go to Classes or Dashboard to set up rosters and assessments for this term.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
        <div className="space-y-1">
            <h2 className="text-5xl font-black tracking-tighter">{term.name.toUpperCase()}</h2>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em]">Consolidated Academic Record</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
            <Badge variant={term.is_finalised ? "default" : "outline"} className={term.is_finalised ? "bg-green-600 border-none px-4 py-1" : "px-4 py-1"}>
                {term.is_finalised ? "FINALIZED RECORD" : "WORKING DRAFT"}
            </Badge>
            <span className="text-[10px] font-black text-slate-400">TOTAL LEARNERS: {data.totalLearners}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-8">
            <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest">Class Registers & Audit</h3>
                </div>
                <div className="grid gap-3">
                    {data.classes.map(cls => (
                        <div key={cls.id} className="p-4 rounded-xl border bg-slate-50/50 flex justify-between items-center group">
                            <div>
                                <p className="font-bold text-sm text-slate-900">{cls.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{cls.subject} • {cls.grade}</p>
                            </div>
                            <div className="text-right">
                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 text-[9px] h-5">
                                    {cls.learnerCount} NAMES
                                </Badge>
                                <p className="text-[8px] font-black text-green-600 uppercase mt-1">Register Compiled</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest">Evidence Registry</h3>
                </div>
                <div className="p-6 rounded-2xl border bg-green-50/30 flex flex-col items-center text-center space-y-3">
                    <div className="text-3xl font-black text-green-700">{data.totalEvidence}</div>
                    <p className="text-xs font-bold text-slate-600">Secure Audit Attachments</p>
                    <p className="text-[9px] text-slate-400 uppercase leading-relaxed">
                        Scripts, moderation notes, and photos linked to official learner records.
                    </p>
                </div>
            </section>
        </div>

        <div className="space-y-8">
             <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <FileBarChart className="h-5 w-5 text-purple-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest">Assessment Schedule</h3>
                </div>
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-3 py-2 font-black text-slate-500">TASK</th>
                                <th className="px-3 py-2 font-black text-slate-500">TYPE</th>
                                <th className="px-3 py-2 font-black text-slate-500 text-right">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.assessments.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-3 py-8 text-center italic text-slate-400">No formal assessments recorded.</td>
                                </tr>
                            ) : (
                                data.assessments.slice(0, 10).map(ass => (
                                    <tr key={ass.id}>
                                        <td className="px-3 py-2 font-bold">{ass.title}</td>
                                        <td className="px-3 py-2 text-slate-500 uppercase text-[10px] font-bold">{ass.type}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-600">{ass.max_mark}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest">Performance Analysis</h3>
                </div>
                <div className="grid gap-3">
                    {data.classes.map(cls => (
                        <div key={cls.id} className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="font-black text-[10px] uppercase text-slate-400">Class: {cls.name}</span>
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[10px]">{cls.passRate}% PASS</Badge>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900">{cls.average}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Term Avg</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
      </div>

      <div className="space-y-4 border-t pt-8">
          <TeacherFileAnnotation 
            yearId={term.year_id} 
            termId={term.id} 
            sectionKey={`${term.name.toLowerCase().replace(' ', '')}.commentary`} 
            label={`${term.name} Administrative Commentary`}
            placeholder={`Add your teacher reflections for ${term.name} here...`}
          />
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