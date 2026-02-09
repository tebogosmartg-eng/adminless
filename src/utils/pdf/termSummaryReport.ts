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
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const startY = addHeader(doc, profile, `${termName} Performance Summary: ${grade} ${subject}`);
    
    // Summary Calculations
    const averages = reportData.map(r => r.termAverage).filter(a => a > 0);
    const classAvg = averages.length > 0 ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1) : "0.0";
    const passRate = averages.length > 0 ? Math.round((averages.filter(a => a >= 50).length / averages.length) * 100) : 0;

    const bands = {
        "0-29%": averages.filter(a => a < 30).length,
        "30-39%": averages.filter(a => a >= 30 && a < 40).length,
        "40-49%": averages.filter(a => a >= 40 && a < 50).length,
        "50-59%": averages.filter(a => a >= 50 && a < 60).length,
        "60-69%": averages.filter(a => a >= 60 && a < 70).length,
        "70-79%": averages.filter(a => a >= 70 && a < 80).length,
        "80-100%": averages.filter(a => a >= 80).length,
    };

    // Performance Summary Table
    doc.setFontSize(11);
    doc.text("AGGREGATED PERFORMANCE", margin, startY + 5);
    autoTable(doc, {
        startY: startY + 8,
        head: [['Total Students', 'Subject Avg', 'Pass Rate']],
        body: [[reportData.length, `${classAvg}%`, `${passRate}%`]],
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0 },
        margin: { left: margin, right: pageWidth - 100 }
    });

    // Mark Distribution
    doc.text("DISTRIBUTION", pageWidth / 2, startY + 5);
    autoTable(doc, {
        startY: startY + 8,
        head: [Object.keys(bands)],
        body: [Object.values(bands)],
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0 },
        margin: { left: pageWidth / 2, right: margin }
    });

    // Main Results Table
    const tableY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("LEARNER TERM AGGREGATES", margin, tableY);

    const tableBody = reportData.map(r => [
        r.learnerName,
        r.className,
        ...allAssessmentTitles.map(title => r.assessments[title] || "-"),
        `${r.termAverage}%`,
        getGradeSymbol(r.termAverage, gradingScheme)?.symbol || '-'
    ]);

    autoTable(doc, {
        startY: tableY + 3,
        head: [['Learner', 'Class', ...allAssessmentTitles, 'Average', 'Symbol']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        styles: { fontSize: 8 },
    });

    addFooter(doc);
    doc.save(`${grade}_${subject}_${termName}_Summary.pdf`);
};