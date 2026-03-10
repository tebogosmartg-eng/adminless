"use client";

import React from 'react';
import { Term, AcademicYear, Assessment } from '@/lib/types';
import { useTeacherFileData } from '@/hooks/useTeacherFileData';
import { TeacherFileSection } from './TeacherFileSection';
import { TimetableGrid } from '@/components/TimetableGrid';
import { TeacherFileRecordOfWork } from './TeacherFileRecordOfWork';
import { TeacherFilePerformanceMatrix } from './TeacherFilePerformanceMatrix';
import { EvidenceManager } from '@/components/evidence/EvidenceManager';
import { ClassCurriculumTab } from '@/components/ClassCurriculumTab';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/context/SettingsContext';
import { Loader2, User, Mail, Phone, Hash, ShieldCheck, Printer } from 'lucide-react';
import { RemediationActionPlan } from '@/components/analysis/RemediationActionPlan';
import { Button } from '@/components/ui/button';

export const TeacherFileView = ({ year, term, classId }: { year: AcademicYear, term: Term, classId: string }) => {
  const { data, loading, error } = useTeacherFileData(year.id, term.id, classId);
  const { teacherName, contactEmail, contactPhone, schoolCode, saceNumber } = useSettings();

  if (loading) return <div className="py-20 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /><p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Assembling File...</p></div>;
  if (error || !data) return <div className="py-20 text-center text-red-500">Failed to load class data.</div>;

  const { classInfo, assessments, stats } = data;
  const prefix = `${classId}_${term.id}_`; // Isolates manual file uploads to this specific class+term
  const isLocked = term.is_finalised || term.closed;

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
        
        {/* File Header */}
        <div className="bg-white dark:bg-card rounded-2xl p-8 md:p-12 border shadow-sm text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <ShieldCheck className="h-40 w-40" />
            </div>
            <div className="space-y-2 relative z-10">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Teacher File</h1>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{classInfo.grade} {classInfo.subject} — {classInfo.className}</p>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border text-xs font-bold uppercase tracking-widest">
                    <span>{year.name}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-400" />
                    <span className="text-blue-600">{term.name}</span>
                </div>
            </div>
            
            <div className="pt-8 flex justify-center no-print">
                <Button variant="outline" className="gap-2 font-bold shadow-sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Print / Save as PDF
                </Button>
            </div>
        </div>

        {/* Section 1: Profile */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}profile`}
            title="1. Profile & Allocation"
            description="Personal details and active teaching timetable."
            hideAttachments isLocked={isLocked}
        >
            <div className="grid gap-6">
                <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0 text-center md:text-left">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Educator Name</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white truncate">{teacherName || "Not available in Profile"}</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4">
                        {schoolCode && (
                            <div className="text-center md:text-right px-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center md:justify-end gap-1">
                                    <Hash className="h-2.5 w-2.5" /> EMIS Code
                                </p>
                                <p className="font-bold text-slate-700 dark:text-slate-300">{schoolCode}</p>
                            </div>
                        )}
                        {saceNumber && (
                            <div className="text-center md:text-right px-2 border-l">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center md:justify-end gap-1">
                                    <ShieldCheck className="h-2.5 w-2.5" /> SACE No.
                                </p>
                                <p className="font-bold text-slate-700 dark:text-slate-300">{saceNumber}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{contactEmail || "Not available"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Number</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contactPhone || "Not available"}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <TimetableGrid />
                </div>
            </div>
        </TeacherFileSection>

        {/* Section 2: Policy */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}policy`}
            title="2. Policy & Support Documents"
            description="Upload CAPS documents, NPPPR, and subject guidelines here."
            isLocked={isLocked}
        />

        {/* Section 3: Planning */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}planning`}
            title="3. Planning"
            description="Annual Teaching Plan and Record of Work."
            isLocked={isLocked}
        >
            <div className="space-y-10">
                <div>
                    <h4 className="text-sm font-bold mb-4">Annual Teaching Plan (ATP) Tracker</h4>
                    <ClassCurriculumTab classId={classInfo.id} subject={classInfo.subject} grade={classInfo.grade} />
                </div>
                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-bold mb-4">File Control / Record of Work</h4>
                    <TeacherFileRecordOfWork termId={term.id} classId={classInfo.id} />
                </div>
            </div>
        </TeacherFileSection>

        {/* Section 4: Assessment */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}assessment`}
            title="4. Assessment"
            description="Programme of Assessment, Marksheets, Moderation, and Interventions."
            isLocked={isLocked}
        >
            <div className="space-y-12">
                <div>
                    <h4 className="text-sm font-bold mb-4">Programme of Assessment (POA)</h4>
                    <div className="border rounded-xl overflow-hidden bg-white dark:bg-card shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-[10px] uppercase">Task Title</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Type</TableHead>
                                    <TableHead className="text-right font-bold text-[10px] uppercase">Total</TableHead>
                                    <TableHead className="text-right font-bold text-[10px] uppercase">Weight</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assessments.map((ass: Assessment) => (
                                    <TableRow key={ass.id}>
                                        <TableCell className="font-medium text-sm">{ass.title}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{ass.type}</TableCell>
                                        <TableCell className="text-right font-mono">{ass.max_mark}</TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">{ass.weight}%</TableCell>
                                    </TableRow>
                                ))}
                                {assessments.length === 0 && (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs italic">No formal tasks recorded yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-bold mb-4">Mark Schedules & Performance Summary</h4>
                    <TeacherFilePerformanceMatrix classes={[{ id: classInfo.id, name: classInfo.className, subject: classInfo.subject, grade: classInfo.grade, average: stats.average, passRate: stats.passRate }]} />
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-bold mb-4">Moderation & Evidence Audit</h4>
                    <EvidenceManager classId={classInfo.id} termId={term.id} isLocked={isLocked} />
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-bold mb-4">Subject Improvement Plan (SIP)</h4>
                    <RemediationActionPlan classId={classInfo.id} termId={term.id} />
                </div>
            </div>
        </TeacherFileSection>

        {/* Section 5: Reports */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}reports`}
            title="5. Reports & Monitoring"
            description="Educator reports, IQMS documents, Subject Meeting Minutes, and Correspondence."
            isLocked={isLocked}
        />

        {/* Section 6: Resources */}
        <TeacherFileSection 
            yearId={year.id} termId={term.id} sectionKey={`${prefix}resources`}
            title="6. Resources"
            description="Textbook and LTSM control records."
            isLocked={isLocked}
        />
    </div>
  );
};