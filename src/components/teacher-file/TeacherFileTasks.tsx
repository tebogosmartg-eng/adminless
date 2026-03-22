"use client";

import React from 'react';
import { Assessment, Rubric } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, ListChecks, Layers, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface TeacherFileTasksProps {
    assessments: Assessment[];
    rubrics: Rubric[];
}

export const TeacherFileTasks = ({ assessments, rubrics }: TeacherFileTasksProps) => {
    if (!assessments.length) return <div className="text-sm text-muted-foreground italic border-2 border-dashed p-8 rounded-xl text-center print:border-none print:text-left print:p-2 print:text-slate-600">No formal assessment tasks scheduled for this term.</div>;
    
    return (
        <div className="space-y-6">
            {assessments.map(ass => {
                const rubric = rubrics.find(r => r.id === ass.rubric_id);
                return (
                    <div key={ass.id} className="border rounded-xl bg-white shadow-sm overflow-hidden p-0 space-y-0 print-avoid-break print:shadow-none print:border-slate-300">
                        <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-transparent">
                            <div>
                                <h5 className="font-black text-sm flex items-center gap-2 text-slate-900">
                                    <FileText className="h-4 w-4 text-blue-600 no-print"/> 
                                    {ass.title}
                                </h5>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1 print:text-slate-600">
                                    {ass.type}
                                </p>
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Date</span>
                                    <span>{ass.date ? format(new Date(ass.date), 'dd MMM yyyy') : 'TBA'}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Total Marks</span>
                                    <span className="font-bold">{ass.max_mark}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Weighting</span>
                                    <span className="font-bold text-blue-600 print:text-black">{ass.weight}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {ass.questions && ass.questions.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden print:border-slate-300">
                                    <div className="bg-blue-50/50 px-3 py-2 border-b text-[10px] font-black uppercase tracking-widest text-blue-800 flex items-center gap-2 print:bg-transparent print:text-black">
                                        <ListChecks className="h-3 w-3 no-print" /> Question Breakdown / Memo Structure
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent print:bg-slate-100">
                                                <TableHead className="w-16 text-[9px] font-black uppercase">Q#</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase">Skill / Description</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase">Topic</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase">Cognitive Level</TableHead>
                                                <TableHead className="text-right text-[9px] font-black uppercase">Max</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ass.questions.map(q => (
                                                <TableRow key={q.id}>
                                                    <TableCell className="font-bold text-xs">{q.question_number}</TableCell>
                                                    <TableCell className="text-xs text-slate-700 print:text-black">{q.skill_description || '-'}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-[9px] bg-slate-50 print:bg-transparent print:border-slate-400 print:text-black">{q.topic || '-'}</Badge></TableCell>
                                                    <TableCell><span className="text-[9px] uppercase font-bold text-slate-500 print:text-slate-800">{q.cognitive_level || '-'}</span></TableCell>
                                                    <TableCell className="text-right font-bold text-xs">{q.max_mark}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : rubric ? (
                                <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/30 print:bg-transparent print:border-slate-300">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-700 mb-2 print:text-black">
                                        <Layers className="h-3 w-3 no-print" /> Attached Rubric: {rubric.title}
                                    </div>
                                    <p className="text-xs font-medium text-slate-700 mb-3 print:text-black">{rubric.criteria.length} criteria defined. (Total: {rubric.total_points} pts)</p>
                                    <div className="grid gap-2">
                                        {rubric.criteria.map((c, i) => (
                                            <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-purple-100/50 print:border-slate-300">
                                                <span className="font-bold">{i+1}. {c.title}</span>
                                                <span className="text-muted-foreground print:text-black">{c.weight} pts max</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-6 text-xs text-slate-400 italic print:text-slate-600 print:justify-start">
                                    <CheckCircle2 className="h-4 w-4 mr-2 opacity-30 no-print" />
                                    Standard marks-only assessment; no granular rubric or item analysis required.
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}