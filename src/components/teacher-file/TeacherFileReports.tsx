"use client";

import React, { useMemo } from 'react';
import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/charts/MarkDistributionChart';
import { ClassInfo, Assessment, AssessmentMark, Learner } from '@/lib/types';
import { calculateWeightedAverage } from '@/utils/calculations';

interface TeacherFileReportsProps {
    classInfo: ClassInfo;
    assessments: Assessment[];
    marks: AssessmentMark[];
}

export const TeacherFileReports = ({ classInfo, assessments, marks }: TeacherFileReportsProps) => {
    
    const learnersWithAverages = useMemo(() => {
        return classInfo.learners.map(l => {
            const termAvg = l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0;
            return {
                ...l,
                mark: termAvg > 0 ? termAvg.toString() : ""
            } as Learner;
        });
    }, [classInfo.learners, assessments, marks]);

    if (!assessments.length) return <div className="text-sm text-slate-600 italic font-medium print:text-black">Performance aggregation is processed upon completion of the term's formal assessment cycle.</div>;

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 print-avoid-break">
                <ClassStats learners={learnersWithAverages} isDocumentMode />
            </div>
            <div className="lg:col-span-2 print-avoid-break">
                <MarkDistributionChart 
                    learners={learnersWithAverages} 
                    title="Term Final Mark Distribution" 
                    description="Aggregated performance symbols for the term." 
                    isDocumentMode
                />
            </div>
        </div>
    );
};