"use client";

import React from 'react';
import { Term, AcademicYear, Assessment } from '@/lib/types';
import { useTeacherFileData } from '@/hooks/useTeacherFileData';
import { TeacherFileSection } from './TeacherFileSection';
import { TimetableGrid } from '@/components/TimetableGrid';
import { TeacherFileRecordOfWork } from './TeacherFileRecordOfWork';
import { TeacherFileTasks } from './TeacherFileTasks';
import { TeacherFileMarkSchedule } from './TeacherFileMarkSchedule';
import { TeacherFileReports } from './TeacherFileReports';
import { EvidenceManager } from '@/components/evidence/EvidenceManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/SettingsContext';
import { Loader2, User, Hash, ShieldCheck, Printer, BookOpen, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { TeacherFileLayout } from '@/components/teacher-file/TeacherFileLayout';

export const TeacherFileView = ({ year, term, classId, isBulkMode = false }: { year: AcademicYear, term: Term, classId: string, isBulkMode?: boolean }) => {
  const { data, loading, error } = useTeacherFileData(year.id, term.id, classId);
  const { teacherName, schoolCode, saceNumber, gradingScheme } = useSettings();

  if (loading) return <div className="py-20 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /><p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Assembling File...</p></div>;
  if (error || !data) return <div className="py-20 text-center text-red-500">Failed to load class data.</div>;

  const { classInfo, assessments, marks, moderationSample, rubrics, diagnostics, flexSections, flexEntries, flexAttachments } = data;
  const prefix = `${classId}_${term.id}_`; // Isolates manual file uploads to this specific class+term
  
  // FORCE LOCKED MODE for pure document preview
  const isLocked = true;

  const summaryText = `During the ${term.name} of ${year.name}, ${classInfo.learners.length} learners completed ${assessments.length} formal assessment tasks in ${classInfo.subject}. The class achieved an overall average of ${data.stats.average}% with a pass rate of ${data.stats.passRate}%.` 
  + (diagnostics.length > 0 ? ` ${diagnostics.length} diagnostic analyses were conducted to guide ongoing pedagogical interventions.` : '') 
  + (moderationSample ? ` A moderation sample of ${moderationSample.learner_ids.length} learners was validated.` : '');

  return (
    <div className="flex flex-col items-center gap-12 bg-slate-100/50 py-12 print:py-0 print:bg-transparent print:gap-0 w-full rounded-2xl overflow-hidden">
      
      {/* Action Bar (No Print) */}
      {!isBulkMode && (
        <div className="w-full max-w-[210mm] flex justify-end no-print mb-[-1rem]">
           <Button className="gap-2 font-black shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 h-12 px-8 text-lg rounded-2xl" onClick={() => window.print()}>
              <Printer className="h-5 w-5" /> Print / Save as PDF
           </Button>
        </div>
      )}

      {/* Chapter 1: Cover Page */}
      <TeacherFileLayout pageNumber={1}>
         <div className="flex flex-col items-center justify-center h-full flex-1 text-center space-y-8 py-20">
            <ShieldCheck className="h-32 w-32 text-blue-600/10 mb-8" />
            <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tight text-slate-900">Teacher File</h1>
                <p className="text-3xl font-bold text-blue-600">{classInfo.subject}</p>
                <p className="text-xl font-medium text-slate-500">{classInfo.grade} - {classInfo.className}</p>
            </div>
            
            <div className="inline-flex items-center gap-3 px-8 py-3 mt-8 bg-slate-50 rounded-full border text-sm font-bold uppercase tracking-widest">
                <span>{year.name}</span>
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-blue-600">{term.name}</span>
            </div>

            <div className="mt-20 p-8 bg-blue-50/50 rounded-3xl border border-blue-100 max-w-2xl text-left shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-blue-800 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Executive Summary
                </h4>
                <p className="text-sm text-blue-900 leading-relaxed font-medium">
                    {summaryText}
                </p>
            </div>
         </div>
      </TeacherFileLayout>

      {/* Chapter 2: Admin & Planning */}
      <TeacherFileLayout pageNumber={2}>
          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}profile`}
              title="1. Profile & Allocation"
              description="Personal details and active teaching timetable."
              hideAttachments isLocked={isLocked}
          >
              <div className="grid gap-6">
                  <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border bg-white shadow-sm print:shadow-none print:border-slate-300">
                      <div className="p-3 bg-blue-50 rounded-lg text-blue-600 print:bg-transparent print:border print:border-slate-300">
                          <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0 text-center md:text-left">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Educator Name</p>
                          <p className="text-lg font-black text-slate-900 truncate print:text-black">{teacherName || "Not available in Profile"}</p>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 print:border-slate-300">
                          {schoolCode && (
                              <div className="text-center md:text-right px-2">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center md:justify-end gap-1">
                                      <Hash className="h-2.5 w-2.5" /> EMIS Code
                                  </p>
                                  <p className="font-bold text-slate-700 print:text-black">{schoolCode}</p>
                              </div>
                          )}
                          {saceNumber && (
                              <div className="text-center md:text-right px-2 border-l print:border-slate-300">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center md:justify-end gap-1">
                                      <ShieldCheck className="h-2.5 w-2.5" /> SACE No.
                                  </p>
                                  <p className="font-bold text-slate-700 print:text-black">{saceNumber}</p>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="mt-4">
                      <TimetableGrid />
                  </div>
              </div>
          </TeacherFileSection>

          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}policy`}
              title="2. Policy & Support Documents"
              description="CAPS documents, NPPPR, and subject guidelines."
              isLocked={isLocked}
          />

          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}planning`}
              title="3. Planning"
              description="Annual Teaching Plan and Record of Work."
              isLocked={isLocked}
          >
              <div className="space-y-10">
                  <div className="pt-8 border-t border-slate-100 print:border-slate-300">
                      <h4 className="text-sm font-bold mb-4">File Control / Record of Work</h4>
                      <TeacherFileRecordOfWork termId={term.id} classId={classInfo.id} />
                  </div>
              </div>
          </TeacherFileSection>
      </TeacherFileLayout>

      {/* Chapter 3: Assessment & Moderation */}
      <TeacherFileLayout pageNumber={3}>
          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}assessment`}
              title="4. Assessment & Moderation"
              description="Programme of Assessment, Marksheets, Moderation, and Interventions."
              isLocked={isLocked}
          >
              <div className="space-y-12">
                  <div className="print-avoid-break">
                      <h4 className="text-sm font-bold mb-4 text-blue-800">4.1 Programme of Assessment (POA)</h4>
                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm print:shadow-none print:border-slate-300">
                          <Table>
                              <TableHeader className="bg-slate-50">
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
                                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs italic print:text-black">No formal SBA (School-Based Assessment) tasks are prescribed or recorded in the system for this specific term cycle.</TableCell></TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 print:border-slate-300 print-avoid-break">
                      <h4 className="text-sm font-bold mb-4 text-blue-800">4.2 Formal Assessment Tasks & Memoranda</h4>
                      <TeacherFileTasks assessments={assessments} rubrics={rubrics} />
                  </div>

                  <div className="pt-8 border-t border-slate-100 print:border-slate-300 print-avoid-break">
                      <h4 className="text-sm font-bold mb-4 text-blue-800">4.3 Term Mark Schedule</h4>
                      <TeacherFileMarkSchedule classInfo={classInfo} assessments={assessments} marks={marks} gradingScheme={gradingScheme} />
                  </div>

                  <div className="pt-8 border-t border-slate-100 print:border-slate-300 print-avoid-break">
                      <h4 className="text-sm font-bold mb-4 text-blue-800">4.4 Moderation Evidence</h4>
                      {moderationSample ? (
                          <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 flex items-start gap-4 print:border-none print:bg-transparent print:p-0">
                              <ShieldCheck className="h-6 w-6 text-green-600 mt-1 no-print" />
                              <div>
                                  <h5 className="font-bold text-sm text-green-900 print:text-black">Approved Moderation Sample</h5>
                                  <p className="text-xs text-green-800 mb-3 print:text-slate-800">
                                      Sample basis: {moderationSample.rules_json.basis === 'term_overall' ? 'Term Overall Percentage' : 'Specific Task Performance'}.
                                      Required size: {moderationSample.learner_ids.length} learners.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                      {moderationSample.learner_ids.map((id: string) => {
                                          const l = classInfo.learners.find((c: any) => c.id === id);
                                          return l ? <Badge key={id} variant="outline" className="bg-white border-green-300 text-green-700 print:border-slate-400 print:text-black">{l.name}</Badge> : null;
                                      })}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="mb-6 p-4 rounded-xl border border-muted bg-muted/10 flex items-start gap-4 print:border-none print:bg-transparent print:p-0">
                              <AlertTriangle className="h-6 w-6 text-muted-foreground mt-1 no-print" />
                              <div>
                                  <h5 className="font-bold text-sm text-muted-foreground print:text-black no-print">Moderation Sample Overview</h5>
                                  <p className="text-xs text-muted-foreground no-print">Moderation sample selection is managed externally or not required for the current assessment cycle.</p>
                                  <p className="hidden print:block text-sm text-slate-800 font-medium">Moderation sample selection is managed externally or not required for the current assessment cycle.</p>
                              </div>
                          </div>
                      )}
                      <EvidenceManager classId={classInfo.id} termId={term.id} isLocked={isLocked} />
                  </div>

                  <div className="pt-8 border-t border-slate-100 print:border-slate-300 print-page-break">
                      <h4 className="text-sm font-bold mb-4 text-blue-800">4.5 Diagnostic Analysis & Subject Improvement Plan</h4>
                      
                      {diagnostics.length > 0 ? (
                          <div className="mb-6 space-y-4">
                              {diagnostics.map((d: any) => {
                                  const ass = assessments.find((a: Assessment) => a.id === d.assessment_id);
                                  let parsedThemes = [];
                                  try {
                                      const inter = JSON.parse(d.interventions);
                                      parsedThemes = inter.themes || [];
                                  } catch(e) {}
                                  
                                  return (
                                      <div key={d.id} className="p-4 rounded-xl border bg-slate-50 print:bg-transparent print:border-slate-300 print-avoid-break">
                                          <h5 className="font-bold text-sm mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-500 no-print" /> {ass?.title} - Identified Themes</h5>
                                          {parsedThemes.length > 0 ? (
                                              <ul className="list-disc pl-5 text-sm text-slate-700 print:text-black space-y-1">
                                                  {parsedThemes.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                              </ul>
                                          ) : (
                                              <p className="text-xs italic text-muted-foreground print:text-black">No overarching themes identified in diagnostics.</p>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>
                      ) : (
                          <div>
                              <p className="text-sm text-muted-foreground italic mb-6 no-print">Diagnostic analysis is pending or managed via external departmental processes for this cycle.</p>
                              <p className="hidden print:block text-sm text-slate-800 font-medium mb-6">Diagnostic analysis is pending or managed via external departmental processes for this cycle.</p>
                          </div>
                      )}
                  </div>
              </div>
          </TeacherFileSection>
      </TeacherFileLayout>

      {/* Chapter 4: Reports, Resources & Additional */}
      <TeacherFileLayout pageNumber={4}>
          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}reports`}
              title="5. Educator Reports & Statistics"
              description="Aggregated performance metrics and reporting data."
              isLocked={isLocked}
          >
               <TeacherFileReports classInfo={classInfo} assessments={assessments} marks={marks} />
          </TeacherFileSection>

          <TeacherFileSection 
              yearId={year.id} termId={term.id} sectionKey={`${prefix}resources`}
              title="6. Resources & LTSM"
              description="Textbook and Learner Teacher Support Material control records."
              isLocked={isLocked}
          />

          <div className="space-y-10 pt-16 border-t border-slate-200 mt-16 print:border-none print:mt-0">
              <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900">7. Additional Evidence</h3>
                  <p className="text-xs text-muted-foreground no-print">Supplementary documentation for this academic period.</p>
              </div>

              <TeacherFileSection yearId={year.id} termId={term.id} sectionKey={`${prefix}meeting_minutes`} title="7.1 Subject Meeting Minutes" isLocked={isLocked} />
              <TeacherFileSection yearId={year.id} termId={term.id} sectionKey={`${prefix}moderation_notes`} title="7.2 Moderation Notes" hideAttachments isLocked={isLocked} />
              <TeacherFileSection yearId={year.id} termId={term.id} sectionKey={`${prefix}correspondence`} title="7.3 Correspondence" isLocked={isLocked} />
              <TeacherFileSection yearId={year.id} termId={term.id} sectionKey={`${prefix}supporting_docs`} title="7.4 Supporting Documents" isLocked={isLocked} />
          </div>
      </TeacherFileLayout>
      
      {/* Chapter 5: Flexible Portfolio & Sign-off */}
      <TeacherFileLayout pageNumber={5}>
         {flexSections?.length > 0 && flexEntries?.length > 0 && (
              <TeacherFileSection 
                  yearId={year.id} termId={term.id} sectionKey={`${prefix}portfolio`}
                  title="8. Professional Portfolio"
                  description="Professional portfolio entries, observations, and term targets."
                  isLocked={isLocked}
                  hideAttachments
                  hideCommentary
              >
                  <div className="space-y-8">
                      {flexSections.map((section: any) => {
                          const sectionEntries = flexEntries.filter((e: any) => e.section_id === section.id);
                          if (sectionEntries.length === 0) return null;

                          return (
                              <div key={section.id} className="space-y-4 print-avoid-break">
                                  <h4 className="text-sm font-bold text-blue-800 border-b pb-2 print:text-black print:border-slate-300">
                                      8.{section.sort_order} {section.title}
                                  </h4>
                                  <div className="grid gap-6 pl-4">
                                      {sectionEntries.map((entry: any) => {
                                          const entryAttachments = flexAttachments.filter((a: any) => a.entry_id === entry.id);
                                          return (
                                              <div key={entry.id} className="space-y-2 border-l-2 border-slate-200 pl-4 print:border-slate-300">
                                                  <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-3">
                                                          <h5 className="text-xs font-bold uppercase text-slate-800 print:text-black">{entry.title || "Observation"}</h5>
                                                          {(entry.tags || []).map((tag: string) => (
                                                              <span key={tag} className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded print:border print:border-slate-300 print:bg-transparent print:text-black">
                                                                  {tag}
                                                              </span>
                                                          ))}
                                                      </div>
                                                      <span className="text-[10px] text-slate-500 font-bold print:text-slate-600">
                                                          {new Date(entry.created_at).toLocaleDateString()}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic print:text-black">
                                                      "{entry.content}"
                                                  </p>
                                                  {entryAttachments.length > 0 && (
                                                      <div className="pt-2 flex flex-wrap gap-2">
                                                          {entryAttachments.map((att: any) => (
                                                              <span key={att.id} className="text-[9px] font-bold bg-slate-100 px-2 py-1 rounded border text-slate-600 print:bg-transparent print:border-slate-300 print:text-black">
                                                                  📎 {att.file_name}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </TeacherFileSection>
         )}

          <div className="space-y-10 pt-16 border-t border-slate-200 mt-16 print:border-none print:mt-0">
              <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900">{flexEntries?.length > 0 ? "9" : "8"}. File Control & Moderation Sign-off</h3>
                  <p className="text-xs text-muted-foreground no-print">Official signature block for departmental audits.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-16 gap-y-16 pt-8 print:gap-12">
                  <div className="space-y-4">
                      <div className="h-px w-full bg-slate-900" />
                      <p className="text-[10px] font-black uppercase text-slate-400">Educator Signature & Date</p>
                  </div>
                  <div className="space-y-4">
                      <div className="h-px w-full bg-slate-900" />
                      <p className="text-[10px] font-black uppercase text-slate-400">Moderator / Head of Department</p>
                  </div>
              </div>
              
              <div className="pt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 print:border-slate-300">
                  End of Academic Portfolio — {classInfo.subject} ({year.name} - {term.name})
              </div>
          </div>
      </TeacherFileLayout>
    </div>
  );
};