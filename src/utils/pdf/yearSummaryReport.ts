import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';

export const generateYearSummaryPDF = (
    reportData: any[],
    termNames: string[],
    yearName: string,
    grade: string,
    subject: string,
    profile: SchoolProfile
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const startY = addHeader(doc, profile, `Year End Performance Summary: ${yearName}`);
    
    // Header Metadata
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Grade: ${grade}  |  Subject: ${subject}`, margin, startY + 5);

    // Data Mapping
    const tableBody = reportData.map(r => [
        r.learnerName,
        ...termNames.map(tName => r.termMarks[tName] !== null ? `${r.termMarks[tName]}%` : "-"),
        `${r.finalYearMark}%`,
        r.finalYearMark >= 50 ? 'Pass' : 'Fail'
    ]);

    autoTable(doc, {
        startY: startY + 10,
        head: [['Learner Name', ...termNames, 'Year Final %', 'Status']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 
            0: { cellWidth: 60, fontStyle: 'bold' } 
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === termNames.length + 2) {
                const status = data.cell.text[0];
                if (status === 'Fail') data.cell.styles.textColor = [220, 38, 38];
                if (status === 'Pass') data.cell.styles.textColor = [22, 163, 74];
            }
        }
    });

    const lastY = (doc as any).lastAutoTable.finalY;
    addSignatures(doc, lastY);

    addFooter(doc);
    doc.save(`${grade}_${subject}_Annual_Summary.pdf`);
};