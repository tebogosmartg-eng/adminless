import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo } from '@/components/CreateClassDialog';
import { GradeSymbol, getGradeSymbol } from './grading';
import { format } from 'date-fns';

export const generateClassPDF = (classInfo: ClassInfo, gradingScheme: GradeSymbol[]) => {
  const doc = new jsPDF();

  // Document Configuration
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // Header Section
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text("Class Performance Report", margin, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'PPP')}`, margin, 26);

  // Class Details Box
  doc.setDrawColor(200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, 32, pageWidth - (margin * 2), 24, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Subject:", margin + 5, 40);
  doc.text("Class Name:", margin + 5, 48);
  doc.text("Grade:", margin + 80, 40);
  doc.text("Total Learners:", margin + 80, 48);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(classInfo.subject, margin + 25, 40);
  doc.text(classInfo.className, margin + 25, 48);
  doc.text(classInfo.grade, margin + 95, 40);
  doc.text(classInfo.learners.length.toString(), margin + 110, 48);

  // Stats Calculation
  const marks = classInfo.learners
    .map(l => parseFloat(l.mark))
    .filter(m => !isNaN(m));
  
  const average = marks.length > 0 
    ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) 
    : "N/A";
  
  const passCount = marks.filter(m => m >= 50).length;
  const passRate = marks.length > 0 
    ? Math.round((passCount / marks.length) * 100) 
    : 0;

  // Stats in Header
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("Average:", margin + 140, 40);
  doc.text("Pass Rate:", margin + 140, 48);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${average}%`, margin + 160, 40);
  doc.text(`${passRate}%`, margin + 160, 48);

  // Table Data
  const tableRows = classInfo.learners.map((learner, index) => {
    const symbolObj = getGradeSymbol(learner.mark, gradingScheme);
    return [
      index + 1,
      learner.name,
      learner.mark ? `${learner.mark}%` : '-',
      symbolObj ? symbolObj.symbol : '-',
      symbolObj ? `L${symbolObj.level}` : '-',
      learner.comment || '-'
    ];
  });

  // Generate Table
  autoTable(doc, {
    startY: 65,
    head: [['#', 'Learner Name', 'Mark', 'Symbol', 'Level', 'Comment']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 37, 36], // Dark gray (stone-800)
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 'auto', fontStyle: 'italic' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249] // Very light gray (stone-50)
    },
    margin: { top: 65, right: margin, bottom: 20, left: margin },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save
  doc.save(`${classInfo.className}_${classInfo.subject}_Report.pdf`);
};