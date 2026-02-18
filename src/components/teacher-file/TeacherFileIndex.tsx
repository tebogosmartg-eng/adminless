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
    Mail
} from 'lucide-react';
import { TermCompletionSummary } from './TermCompletionSummary';

export const TeacherFileIndex = ({ terms, year }: { terms: Term[], year: AcademicYear | null }) => {
  const sections = [
    { num: "1", title: "Personal details", icon: User },
    { num: "2", title: "Timetable", icon: CalendarDays },
    { num: "3", title: "Subject Policy and Support Documents", icon: ShieldCheck },
    { num: "4", title: "Planning", icon: BookText, sub: ["4.1 ATP", "4.2 Lesson Plan", "4.3 File Control sheets A & B"] },
    { num: "5", title: "Assessment", icon: GraduationCap, sub: ["5.1 POA", "5.2 Formal Assessment Tasks", "5.3 Memoranda", "5.4 Moderation", "5.5 Record sheets", "5.6 Subject Improvement Plan"] },
    { num: "6", title: "Educator Reports", icon: FileText },
    { num: "7", title: "Textbook / LTSMs control records", icon: Users },
    { num: "8", title: "Subject Meeting Minutes", icon: ClipboardList },
    { num: "9", title: "IQMS", icon: Settings },
    { num: "10", title: "Correspondence", icon: Mail },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h2 className="text-4xl font-black tracking-tight text-slate-900">Contents Page</h2>
        <div className="h-1.5 w-24 bg-blue-600 rounded-full" />
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Index Structure</h3>
            <div className="grid gap-3">
                {sections.map((s) => (
                    <div key={s.num} className="space-y-1">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 group">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-blue-600 font-bold w-4">{s.num}.</span>
                                <span className="text-sm font-black text-slate-700">{s.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <s.icon className="h-3 w-3 text-slate-300" />
                                <span className="text-[10px] font-mono text-slate-300">SEC {s.num.padStart(2, '0')}</span>
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
                ))}
            </div>
        </div>

        <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Term Readiness Status</h3>
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
                    <h4 className="text-xl font-black">Audit Validated</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        This digital file aggregates all academic interactions including attendance, marks, and pedagogical interventions into a singular CAPS-compliant record.
                    </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center gap-3 relative z-10">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Database Connected</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
</dyad-file>

<dyad-write path="src/hooks/useTeacherFileTermData.ts" description="Enhanced Term data fetcher including remediation counts">
"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useTeacherFileTermData = (termId: string, yearId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const classes = await db.classes
            .where('[year_id+term_id]')
            .equals([yearId, termId])
            .toArray();
        
        if (!isMounted.current) return;
        if (classes.length === 0) {
            setData({ empty: true });
            setLoading(false);
            return;
        }

        const classIds = classes.map(c => c.id);

        const [learners, assessments, marks, evidence, remediationTasks] = await Promise.all([
            db.learners.where('class_id').anyOf(classIds).toArray(),
            db.assessments.where('term_id').equals(termId).filter(a => classIds.includes(a.class_id)).toArray(),
            db.assessment_marks.toArray(),
            db.evidence.where('term_id').equals(termId).filter(e => classIds.includes(e.class_id)).toArray(),
            db.remediation_tasks.where('term_id').equals(termId).toArray()
        ]);

        if (!isMounted.current) return;

        const assessmentIds = new Set(assessments.map(a => a.id));
        const relevantMarks = marks.filter(m => assessmentIds.has(m.assessment_id));

        const classAnalytics = classes.map(cls => {
            const clsAss = assessments.filter(a => a.class_id === cls.id);
            const clsLearners = learners.filter(l => l.class_id === cls.id);
            const clsMarks = relevantMarks.filter(m => clsAss.some(a => a.id === m.assessment_id));

            const learnerAvgs = clsLearners.map(l => {
                if (!l.id) return 0;
                return calculateWeightedAverage(clsAss, clsMarks, l.id);
            }).filter(avg => avg > 0);

            const avg = learnerAvgs.length > 0 
                ? learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length 
                : 0;
            
            const passRate = learnerAvgs.length > 0
                ? (learnerAvgs.filter(a => a >= 50).length / learnerAvgs.length) * 100
                : 0;

            return {
                id: cls.id,
                name: cls.className,
                subject: cls.subject,
                grade: cls.grade,
                average: avg.toFixed(1),
                passRate: Math.round(passRate),
                learnerCount: clsLearners.length,
                assessmentCount: clsAss.length
            };
        });

        setData({
            empty: false,
            classes: classAnalytics,
            assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
            totalEvidence: evidence.length,
            totalLearners: learners.length,
            totalRemediationTasks: remediationTasks.length
        });
      } catch (err: any) {
        if (isMounted.current) setError(err.message || "Failed to compile term data.");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchData();

    return () => {
        isMounted.current = false;
    };
  }, [termId, yearId]);

  return { data, loading, error };
};