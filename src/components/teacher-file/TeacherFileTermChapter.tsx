"use client";

import React, { useState } from 'react';
import { Term, Assessment } from '@/lib/types';
import { useTeacherFileTermData } from '@/hooks/useTeacherFileTermData';
import { TeacherFileSection } from './TeacherFileSection';
import { TimetableGrid } from '@/components/TimetableGrid';
import { TaskSlotManager } from './TaskSlotManager';
import { TeacherFileRecordOfWork } from './TeacherFileRecordOfWork';
import { TeacherFilePerformanceMatrix } from './TeacherFilePerformanceMatrix';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    LayoutGrid, 
    Rocket,
    User,
    Mail,
    Phone,
    Hash,
    BookOpen,
    ShieldCheck,
    ShieldAlert,
    BarChart3,
    FileText,
    Lock,
    Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const TeacherFileTermChapter = ({ term }: { term: Term }) => {
  const { data, loading } = useTeacherFileTermData(term.id, term.year_id);
  const { teacherName, contactEmail, contactPhone, schoolCode, saceNumber } = useSettings();
  const [selectedAssId, setSelectedAssId] = useState<string>("all");

  const isLocked = term.is_finalised || term.closed;

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
        {isLocked && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200 mb-6 no-print">
                <Lock className="h-3.5 w-3.5" />
                <span>Term finalised — Teacher File is read-only.</span>
                <Badge variant="outline" className="ml-auto border-amber-200 bg-white/50 text-amber-700 gap-1">
                    <Eye className="h-2.5 w-2.5" /> View Only
                </Badge>
            </div>
        )}

        <h2 className="text-6xl font-black tracking-tighter mb-2">{term.name.toUpperCase()}</h2>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <p className="text-xl font-bold text-blue-600 uppercase tracking-[0.2em]">Consolidated Portfolio</p>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border text-[9px] font-black uppercase tracking-tighter">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    {data.classes.length} Classes • {data.assessments.length} Tasks • {data.totalEvidence} Evidence Files
                </div>
            </div>
            {isLocked && (
                <Badge className="bg-green-600 text-white font-black px-6 py-2 text-sm rounded-full border-none">
                    FINALIZED RECORD
                </Badge>
            )}
        </div>
      </div>

      <div className="space-y-20">
        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="personal_details"
            title="1. Personal details"
            description="Professional educator details synchronized from system profile."
            hideAttachments
            isLocked={isLocked}
        >
            <div className="grid gap-6">
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</p>
                        <p className="text-lg font-black text-slate-900 truncate">{teacherName || "Not available in Profile"}</p>
                    </div>
                    <div className="flex gap-4">
                        {schoolCode && (
                            <div className="text-right px-4 border-l">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-end gap-1">
                                    <Hash className="h-2.5 w-2.5" /> EMIS Code
                                </p>
                                <p className="font-bold text-slate-700">{schoolCode}</p>
                            </div>
                        )}
                        {saceNumber && (
                            <div className="text-right px-4 border-l">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-end gap-1">
                                    <ShieldCheck className="h-2.5 w-2.5" /> SACE No.
                                </p>
                                <p className="font-bold text-slate-700">{saceNumber}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm">
                        <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-slate-700 truncate">{contactEmail || "Not available"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm">
                        <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Number</p>
                            <p className="text-sm font-bold text-slate-700">{contactPhone || "Not available"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </TeacherFileSection>

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="timetable"
            title="2. Timetable"
            description="Active teaching routine for this academic cycle."
            hideCommentary
            hideAttachments
            isLocked={isLocked}
        >
             <div className="scale-90 origin-top">
                <TimetableGrid />
             </div>
        </TeacherFileSection>

        <TeacherFileSection 
            yearId={term.year_id} termId={term.id} sectionKey="subject_policy"
            title="3. Subject Policy and Support Documents"
            description="Upload official departmental policies, CAPS documents, or internal support material."
            isLocked={isLocked}
        />

        <div className="space-y-8 border-l-4 border-slate-100 pl-8">
            <h3 className="text-2xl font-black text-slate-900">4. Planning</h3>
            
            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="atp"
                title="4.1 Annual Teaching Plan (ATP)"
                description="Digital curriculum plan status synced from Curriculum Planner."
                isLocked={isLocked}
            >
                <div className="space-y-4">
                    {data.curriculum.length > 0 ? (
                        <div className="grid gap-2">
                            {data.curriculum.map((topic: any) => (
                                <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm transition-hover hover:border-primary/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-blue-50 rounded text-blue-600"><BookOpen className="h-3.5 w-3.5" /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">{topic.title}</p>
                                            <p className="text-[9px] uppercase font-black text-slate-400">{topic.grade} {topic.subject}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] h-4 uppercase border-blue-200 text-blue-700 bg-blue-50/50">Planned</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">No Digital Curriculum Topics Recorded</p>
                        </div>
                    )}
                </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="lesson_plans"
                title="4.2 Lesson Plan"
                isLocked={isLocked}
            />

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="file_control"
                title="4.3 File Control sheets A and B (Record of Work)"
                description="Automated audit of lesson logs and coverage for this term."
                isLocked={isLocked}
            >
                <TeacherFileRecordOfWork termId={term.id} />
            </TeacherFileSection>
        </div>

        <div className="space-y-8 border-l-4 border-blue-600 pl-8">
            <h3 className="text-2xl font-black text-slate-900">5. Assessment</h3>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="poa"
                title="5.1 Programme of Assessment"
                isLocked={isLocked}
            >
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="font-black text-[10px] uppercase">Task Title</TableHead>
                            <TableHead className="font-black text-[10px] uppercase">Type</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">Total</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">Weight</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.assessments.map((ass: Assessment) => (
                            <TableRow key={ass.id}>
                                <TableCell className="text-sm font-bold text-slate-900">{ass.title}</TableCell>
                                <TableCell className="text-xs text-muted-foreground uppercase font-medium">{ass.type}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-slate-700">{ass.max_mark}</TableCell>
                                <TableCell className="text-right font-bold text-blue-600">{ass.weight}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="fats"
                title="5.2 Formal Assessment Tasks"
                isLocked={isLocked}
            >
                <TaskSlotManager 
                    term={term} 
                    classes={data.classes} 
                    assessments={data.assessments}
                    isLocked={isLocked}
                />
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="memoranda"
                title="5.3 Memoranda"
                description="Upload and link task-specific memoranda."
                isLocked={isLocked}
                assessmentId={selectedAssId === 'all' ? null : selectedAssId}
            >
                <div className="mb-4 flex items-center justify-between no-print">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Filter by Assessment</p>
                    <Select value={selectedAssId} onValueChange={setSelectedAssId}>
                        <SelectTrigger className="h-8 w-48 text-[10px] font-bold bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">-- Show All --</SelectItem>
                            {data.assessments.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="moderation"
                title="5.4 Moderation"
                description="Automated audit trail proof for departmental moderation."
                isLocked={isLocked}
                assessmentId={selectedAssId === 'all' ? null : selectedAssId}
            >
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {data.classes.map((cls: any) => (
                            <div key={cls.id} className="p-4 rounded-xl border bg-white shadow-sm space-y-2">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter truncate max-w-[100px]">{cls.name}</span>
                                    <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-green-200 text-green-700 bg-green-50/50">Audit Ready</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="p-1.5 bg-blue-50 rounded-md"><ShieldCheck className="h-3.5 w-3.5 text-blue-600" /></div>
                                        <span className="text-xl font-black">{cls.scriptCount}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase text-right leading-tight">Sample Scripts<br/>Attached</span>
                                </div>
                                {cls.sampleNames.length > 0 && (
                                    <div className="pt-2 border-t mt-1">
                                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Formal Sample:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {cls.sampleNames.slice(0, 3).map((name: string, i: number) => (
                                                <span key={i} className="text-[9px] font-bold text-slate-600 truncate max-w-[80px] bg-slate-50 px-1 rounded border">{name}</span>
                                            ))}
                                            {cls.sampleNames.length > 3 && <span className="text-[8px] text-slate-400 self-center">+{cls.sampleNames.length - 3} more</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 flex items-start gap-3 no-print">
                        <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-[10px] text-amber-800 leading-tight">
                            <strong>Note to Moderator:</strong> Digital evidence (scripts) for the required 10% sample is available in individual class evidence folders.
                        </p>
                    </div>
                </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="record_sheets"
                title="5.5 Record sheets / Mark schedules"
                isLocked={isLocked}
            >
                 <div className="grid gap-3">
                    {data.classes.map((cls: any) => (
                        <div key={cls.id} className="p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-muted rounded-lg group-hover:bg-primary/5 transition-colors">
                                    <LayoutGrid className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-black text-slate-900">{cls.name}</p>
                                    <p className="text-[9px] uppercase font-bold text-slate-400">{cls.subject} • {cls.learnerCount} Learners</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase no-print" asChild>
                                <Link to={`/classes/${cls.id}`}>
                                    Marksheet Summary
                                </Link>
                            </Button>
                        </div>
                    ))}
                 </div>
            </TeacherFileSection>

            <TeacherFileSection 
                yearId={term.year_id} termId={term.id} sectionKey="improvement_plan"
                title="5.6 Subject Improvement Plan"
                description="Consolidated performance analysis and intervention proof."
                isLocked={isLocked}
            >
                 <div className="space-y-8">
                    <TeacherFilePerformanceMatrix classes={data.classes} />

                    {data.diagnosticSummaries?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <BarChart3 className="h-3.5 w-3.5" /> Consolidated Diagnostic Findings
                            </h4>
                            <div className="grid gap-2">
                                {data.diagnosticSummaries.map((ds: any, i: number) => (
                                    <div key={i} className="p-3 bg-white border rounded-xl flex items-start gap-3">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                                        <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-2">
                                            "{ds.findings}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4 shadow-sm">
                        <Rocket className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="font-black text-sm text-blue-900">Term Remediation Action Plan</h4>
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                {data.totalRemediationTasks} professional interventions have been activated across this term's classes. 
                                Full audit proof is maintained in the class Remediation registers.
                            </p>
                        </div>
                    </div>
                 </div>
            </TeacherFileSection>
        </div>

        <TeacherFileSection yearId={term.year_id} termId={term.id} sectionKey="educator_reports" title="6. Educator Reports" isLocked={isLocked} />
        <TeacherFileSection yearId={term.year_id} termId={term.id} sectionKey="textbook_records" title="7. Textbook / LTSMs control records" isLocked={isLocked} />
        <TeacherFileSection yearId={term.year_id} termId={term.id} sectionKey="meeting_minutes" title="8. Subject Meeting Minutes" isLocked={isLocked} />
        <TeacherFileSection yearId={term.year_id} termId={term.id} sectionKey="iqms" title="9. IQMS" isLocked={isLocked} />
        <TeacherFileSection yearId={term.year_id} termId={term.id} sectionKey="correspondence" title="10. Correspondence" isLocked={isLocked} />
      </div>
    </div>
  );
};