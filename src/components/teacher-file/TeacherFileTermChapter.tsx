"use client";

import React from 'react';
import { Term } from '@/lib/types';
import { useTeacherFileTermData } from '@/hooks/useTeacherFileTermData';
import { TeacherFileSection } from './TeacherFileSection';
import { TimetableGrid } from '@/components/TimetableGrid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, CheckCircle2, LayoutGrid, Target, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const TeacherFileTermChapter = ({ term }: { term: Term }) => {
  const { data, loading } = useTeacherFileTermData(term.id, term.year_id);

  if (loading) {
    return (
        <div className="h-[200mm] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Compiling Term Chapter...</p>
        </div>
    );
  }

  return (
    <div className="space-y-16">
      <div className="border-b-8 border-slate-900 pb-10">
        <h2 className="text-6xl font-black tracking-tighter mb-2">{term.name.toUpperCase()}</h2>
        <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-blue-600 uppercase tracking-[0.2em]">Consolidated Portfolio</p>
            {term.is_finalised && (
                <Badge className="bg-green-600 text-white font-black px-6 py-2 text-sm rounded-full border-none">
                    FINALIZED RECORD
                </Badge>
            )}
        </div>
      </div>

      <div className="space-y-20">
        {/* 1. Personal Details */}
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="personal_details"
            title="1. Personal details"
            description="Professional educator profile pulled from system settings."
            hideAttachments
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Personal information associated with this academic record.</p>
            </div>
        </TeacherFileSection>

        {/* 2. Timetable */}
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="timetable"
            title="2. Timetable"
            description="Active teaching routine for this academic cycle."
            hideCommentary
            hideAttachments
        >
             <div className="scale-90 origin-top">
                <TimetableGrid />
             </div>
        </TeacherFileSection>

        {/* 3. Subject Policy */}
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="subject_policy"
            title="3. Subject Policy and Support Documents"
            description="Upload official departmental policies or support material."
            isLocked={term.is_finalised}
        />

        {/* 4. Planning */}
        <div className="space-y-8 border-l-4 border-slate-100 pl-8">
            <h3 className="text-2xl font-black text-slate-900">4. Planning</h3>
            
            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="atp"
                title="4.1 Annual Teaching Plan (ATP)"
                isLocked={term.is_finalised}
            />

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="lesson_plans"
                title="4.2 Lesson Plan"
                isLocked={term.is_finalised}
            />

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="file_control"
                title="4.3 File Control sheets A and B"
                isLocked={term.is_finalised}
            />
        </div>

        {/* 5. Assessment */}
        <div className="space-y-8 border-l-4 border-blue-600 pl-8">
            <h3 className="text-2xl font-black text-slate-900">5. Assessment</h3>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="poa"
                title="5.1 Programme of Assessment"
                description="List of all scheduled formal assessment tasks for this term."
                isLocked={term.is_finalised}
            >
                {data.assessments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No formal assessments scheduled.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-black text-[10px] uppercase">Task</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Type</TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase">Total</TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase">Weight</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.assessments.map(ass => (
                                <TableRow key={ass.id}>
                                    <TableCell className="text-sm font-bold">{ass.title}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground uppercase font-medium">{ass.type}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{ass.max_mark}</TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">{ass.weight}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="fats"
                title="5.2 Formal Assessment Tasks"
                description="Linking assessments to required Teacher File slots."
                isLocked={term.is_finalised}
            >
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">The following tasks are active in your term marksheet:</p>
                    <div className="grid gap-2">
                        {data.assessments.map(ass => (
                            <div key={ass.id} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-4 w-4 text-blue-600" /></div>
                                    <span className="text-sm font-black">{ass.title}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] h-5">{ass.type}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="memoranda"
                title="5.3 Memoranda"
                isLocked={term.is_finalised}
            />

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="moderation"
                title="5.4 Moderation"
                isLocked={term.is_finalised}
            />

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="record_sheets"
                title="5.5 Record sheets / Mark schedules"
                description="Auto-populated summaries of your class marksheets."
                isLocked={term.is_finalised}
            >
                 <div className="grid gap-3">
                    {data.classes.map(cls => (
                        <div key={cls.id} className="p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-black">{cls.name}</p>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">{cls.subject} • {cls.learnerCount} Learners</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase" asChild>
                                <Link to={`/classes/${cls.id}`}>
                                    <LayoutGrid className="h-3 w-3" /> View Data
                                </Link>
                            </Button>
                        </div>
                    ))}
                 </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="improvement_plan"
                title="5.6 Subject Improvement Plan"
                description="Pedagogical interventions and diagnostics summarized for audit."
                isLocked={term.is_finalised}
            >
                 <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {data.classes.map(cls => (
                            <div key={cls.id} className="p-4 rounded-xl border bg-primary/[0.02] border-primary/10">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black uppercase text-primary/60">{cls.name}</span>
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px]">{cls.passRate}% Pass</Badge>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-primary">{cls.average}%</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Average Achievement</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4">
                        <Rocket className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-blue-900">Term Remediation Action Plan</h4>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                {data.totalRemediationTasks} official interventions have been activated for this period. 
                                Access the **Remediation** tab in individual classes to view the proof of audit record.
                            </p>
                        </div>
                    </div>
                 </div>
            </TeacherFileSection>
        </div>

        {/* 6-10 Upload Sections */}
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="educator_reports"
            title="6. Educator Reports"
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="textbook_records"
            title="7. Textbook / LTSMs control records"
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="meeting_minutes"
            title="8. Subject Meeting Minutes"
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="iqms"
            title="9. IQMS"
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="correspondence"
            title="10. Correspondence"
            isLocked={term.is_finalised}
        />
      </div>
    </div>
  );
};