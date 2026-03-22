"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClassInfo, Assessment, AssessmentMark, GradeSymbol } from '@/lib/types';
import { calculateWeightedAverage } from '@/utils/calculations';
import { getGradeSymbol } from '@/utils/grading';

interface TeacherFileMarkScheduleProps {
    classInfo: ClassInfo;
    assessments: Assessment[];
    marks: AssessmentMark[];
    gradingScheme: GradeSymbol[];
}

export const TeacherFileMarkSchedule = ({ classInfo, assessments, marks, gradingScheme }: TeacherFileMarkScheduleProps) => {
    if (!assessments.length) return <div className="text-sm text-muted-foreground italic border-2 border-dashed p-8 rounded-xl text-center print:border-none print:text-left print:p-2 print:text-slate-600">Mark schedules are not applicable as no formal assessments are recorded for this cycle.</div>;

    const learners = classInfo.learners || [];

    return (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm print:overflow-visible print:shadow-none print:border-slate-300">
            <Table className="table-fixed text-xs print:text-[10px]">
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-8 text-center text-[10px] font-black uppercase print:text-black">#</TableHead>
                        <TableHead className="w-[200px] font-black text-[10px] uppercase print:text-black">Learner Name</TableHead>
                        {assessments.map((a: Assessment) => (
                            <TableHead key={a.id} className="text-center font-black text-[10px] uppercase px-1 print:text-black">
                                <span className="truncate block" title={a.title}>{a.title}</span>
                                <span className="text-[8px] text-slate-400 print:text-slate-600">/{a.max_mark} ({a.weight}%)</span>
                            </TableHead>
                        ))}
                        <TableHead className="text-center font-black text-[10px] uppercase bg-blue-50/50 print:bg-transparent w-20 print:text-black">Term %</TableHead>
                        <TableHead className="text-center font-black text-[10px] uppercase bg-blue-50/50 print:bg-transparent w-20 print:text-black">Symbol</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {learners.map((l: any, i: number) => {
                        const termAvg = l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0;
                        const symbol = getGradeSymbol(termAvg, gradingScheme);
                        return (
                            <TableRow key={l.id || i} className="hover:bg-slate-50/50">
                                <TableCell className="text-center text-[10px] font-mono text-slate-400 print:text-slate-800">{i + 1}</TableCell>
                                <TableCell className="font-bold truncate print:text-black">{l.name}</TableCell>
                                {assessments.map((a: Assessment) => {
                                    const m = marks.find((mark: any) => mark.assessment_id === a.id && mark.learner_id === l.id);
                                    return <TableCell key={a.id} className="text-center font-medium text-slate-700 print:text-black">{m?.score ?? '-'}</TableCell>
                                })}
                                <TableCell className="text-center font-black text-blue-600 bg-blue-50/20 print:bg-transparent print:text-black">{termAvg > 0 ? termAvg.toFixed(1) : '-'}</TableCell>
                                <TableCell className="text-center bg-blue-50/20 print:bg-transparent">
                                    {symbol ? <Badge variant="outline" className={symbol.badgeColor + " text-[9px] h-4 px-1.5 print:border-slate-400 print:text-black"}>{symbol.symbol}</Badge> : '-'}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}