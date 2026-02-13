import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';

export const generateTermSummaryPDF = (
    reportData: any[],
    allAssessmentTitles: string[],
    termName: string,
    grade: string,
    subject: string,
    gradingScheme: GradeSymbol[],
    profile: SchoolProfile,
    atRiskThreshold: number = 50
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const startY = addHeader(doc, profile, `${termName} Performance Summary: ${grade} ${subject}`);
    
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

    doc.setFontSize(11);
    doc.text("AGGREGATED PERFORMANCE", margin, startY + 5);
    autoTable(doc, {
        startY: startY + 8,
        head: [['Total Learners', 'Subject Avg', 'Pass Rate']],
        body: [[reportData.length, `${classAvg}%`, `${passRate}%`]],
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0 },
        margin: { left: margin, right: pageWidth - 100 }
    });

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

    // At Risk List for the whole group
    const atRiskList = reportData.filter(r => r.termAverage > 0 && r.termAverage < atRiskThreshold);
    if (atRiskList.length > 0) {
        const atRiskY = (doc as any).lastAutoTable.finalY + 10;
        doc.setTextColor(220, 38, 38);
        doc.text("INTERVENTION REQUIRED (At-Risk across Group)", margin, atRiskY);
        doc.setTextColor(0);

        const riskRows = [];
        for (let i = 0; i < atRiskList.length; i += 3) {
            riskRows.push([
                atRiskList[i] ? `${atRiskList[i].learnerName} (${atRiskList[i].termAverage}%)` : "",
                atRiskList[i+1] ? `${atRiskList[i+1].learnerName} (${atRiskList[i+1].termAverage}%)` : "",
                atRiskList[i+2] ? `${atRiskList[i+2].learnerName} (${atRiskList[i+2].termAverage}%)` : ""
            ]);
        }

        autoTable(doc, {
            startY: atRiskY + 3,
            body: riskRows,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            margin: { left: margin }
        });
    }

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
        didParseCell: (data) => {
            if (data.section === 'body') {
                const valStr = data.cell.text[0];
                if (valStr.includes('%')) {
                    const val = parseFloat(valStr);
                    if (val > 0 && val < atRiskThreshold) {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            }
        }
    });

    const lastY = (doc as any).lastAutoTable.finalY;
    addSignatures(doc, lastY);

    addFooter(doc);
    doc.save(`${grade}_${subject}_${termName}_Summary.pdf`);
};