import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { addHeader, addFooter, SchoolProfile } from './base';

export const generateTermSummaryPDF = (
    reportData: any[],
    allAssessmentTitles: string[],
    termName: string,
    grade: string,
    subject: string,
    gradingScheme: GradeSymbol[],
    profile: SchoolProfile
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const startY = addHeader(doc, profile, `${termName} Performance Summary: ${grade} ${subject}`);
    
    const tableBody = reportData.map(r => [
        r.learnerName,
        r.className,
        ...allAssessmentTitles.map(title => r.assessments[title] || "-"),
        `${r.termAverage}%`,
        getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-'
    ]);

    autoTable(doc, {
        startY: startY + 5,
        head: [['Learner', 'Class', ...allAssessmentTitles, 'Average', 'Symbol']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        styles: { fontSize: 8 },
    });

    addFooter(doc);
    doc.save(`${grade}_${subject}_${termName}_Summary.pdf`);
};