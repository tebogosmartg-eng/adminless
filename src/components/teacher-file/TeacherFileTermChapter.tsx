"use client";

import React from 'react';
import { Term } from '@/lib/types';
import { useTeacherFileTermData } from '@/hooks/useTeacherFileTermData';
import { TeacherFileSection } from './TeacherFileSection';
import { TimetableGrid } from '@/components/TimetableGrid';
import { TaskSlotManager } from './TaskSlotManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { 
    Loader2, 
    AlertCircle, 
    FileText, 
    CheckCircle2, 
    LayoutGrid, 
    Rocket,
    User,
    Mail,
    Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeacherFileTermChapter = ({ term }: { term: Term }) => {
  const { data, loading } = useTeacherFileTermData(term.id, term.year_id);
  const { teacherName, contactEmail, contactPhone } = useSettings();

  if (loading) {
    return (
        <div className="h-[200mm] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Compiling Term Chapter...</p>
        </div>
    );
  }

  if (data.empty) {
      return (
          <div className="h-[200mm] flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="bg-muted p-8 rounded-full">
                  <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Term Data Found</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
                      You haven't created any classes or assessments for this term yet.
                  </p>
              </div>
              <Button asChild variant="outline">
                  <Link to="/classes">Initialize Term Workspace</Link>
              </Button>
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
        {/* 1. Personal Details (From Profile Only) */}
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="personal_details"
            title="1. Personal details"
            description="Professional educator details synchronized from system profile."
            hideAttachments
        >
            <div className="grid gap-6">
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-white">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</p>
                        <p className="text-lg font-black text-slate-900">{teacherName || "Not available in Profile"}</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white">
                        <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-slate-700 truncate">{contactEmail || "Not available in Profile"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white">
                        <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Number</p>
                            <p className="text-sm font-bold text-slate-700">{contactPhone || "Not available in Profile"}</p>
                        </div>
                    </div>
                </div>
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
            description="Upload official departmental policies, CAPS documents, or internal support material."
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
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
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
                        {data.assessments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground italic">
                                    No formal assessments recorded for this term chapter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="fats"
                title="5.2 Formal Assessment Tasks"
                description="Map your assessments to the required portfolio structure."
                isLocked={term.is_finalised}
            >
                <TaskSlotManager 
                    term={term} 
                    classes={data.classes} 
                    assessments={data.assessments}
                    isLocked={term.is_finalised}
                />
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
                description="Consolidated summaries of your class achievement."
                isLocked={term.is_finalised}
            >
                 <div className="grid gap-3">
                    {data.classes.map(cls => (
                        <div key={cls.id} className="p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-black">{cls.name}</p>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">{cls.subject} • {cls.learnerCount} Learners</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase no-print" asChild>
                                <Link to={`/classes/${cls.id}`}>
                                    <LayoutGrid className="h-3 w-3" /> View Source
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
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Term Average</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4">
                        <Rocket className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-blue-900">Active Remediation Cycle</h4>
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                {data.totalRemediationTasks} official interventions have been activated across this term's classes. 
                                Full proof of intervention can be generated from individual class Remediation records.
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
            description="Termly performance reports and reflective documents."
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="textbook_records"
            title="7. Textbook / LTSMs control records"
            description="Usage and inventory logs for learning and teaching materials."
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="meeting_minutes"
            title="8. Subject Meeting Minutes"
            description="Departmental, grade, and parent-teacher meeting records."
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="iqms"
            title="9. IQMS"
            description="Integrated Quality Management System documentation."
            isLocked={term.is_finalised}
        />

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="correspondence"
            title="10. Correspondence"
            description="Internal and external academic communications."
            isLocked={term.is_finalised}
        />
      </div>
    </div>
  );
};