import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo } from '@/components/CreateClassDialog';
import { GradeSymbol, getGradeSymbol } from './grading';
import { format } from 'date-fns';

export const generateClassPDF = (
  classInfo: ClassInfo, 
  gradingScheme: GradeSymbol[], 
  schoolName: string = "My School", 
  teacherName: string = ""
) => {
  const doc = new jsPDF();

  // Document Configuration
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // Header Section
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text(schoolName, margin, 20);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Class Performance Report", margin, 28);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = format(new Date(), 'PPP');
  doc.text(`Generated on: ${dateStr}`, margin, 34);
  
  if (teacherName) {
    doc.text(`Teacher: ${teacherName}`, pageWidth - margin - doc.getTextWidth(`Teacher: ${teacherName}`), 20);
  }

  // Class Details Box
  const startY = 42;
  doc.setDrawColor(200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, startY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Subject:", margin + 5, startY + 8);
  doc.text("Class Name:", margin + 5, startY + 16);
  doc.text("Grade:", margin + 80, startY + 8);
  doc.text("Total Learners:", margin + 80, startY + 16);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(classInfo.subject, margin + 25, startY + 8);
  doc.text(classInfo.className, margin + 25, startY + 16);
  doc.text(classInfo.grade, margin + 95, startY + 8);
  doc.text(classInfo.learners.length.toString(), margin + 110, startY + 16);

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
  doc.text("Average:", margin + 140, startY + 8);
  doc.text("Pass Rate:", margin + 140, startY + 16);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${average}%`, margin + 160, startY + 8);
  doc.text(`${passRate}%`, margin + 160, startY + 16);

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
    startY: startY + 30,
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
    doc.text(
      schoolName,
      margin,
      doc.internal.pageSize.height - 10,
      { align: 'left' }
    );
  }

  // Save
  doc.save(`${classInfo.className}_${classInfo.subject}_Report.pdf`);
};

export const generateBlankClassListPDF = (
  classInfo: ClassInfo,
  schoolName: string = "My School", 
  teacherName: string = ""
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Mark Recording Sheet", margin, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(schoolName, margin, 26);

  // Context Info
  const startY = 32;
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Subject: ${classInfo.subject}`, margin, startY);
  doc.text(`Class: ${classInfo.className}`, margin + 80, startY);
  doc.text(`Grade: ${classInfo.grade}`, margin + 140, startY);
  
  if (teacherName) {
    doc.text(`Teacher: ${teacherName}`, margin, startY + 6);
  }

  doc.text(`Date: _______________________`, margin + 80, startY + 6);
  doc.text(`Task: _______________________`, margin + 140, startY + 6);

  // Table Data (Just names and empty columns)
  const tableRows = classInfo.learners.map((learner, index) => [
    index + 1,
    learner.name,
    '', // Mark
    '', // Comment
  ]);

  // Generate Table
  autoTable(doc, {
    startY: startY + 15,
    head: [['#', 'Learner Name', 'Mark / Score', 'Notes / Comments']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: 40,
      lineColor: 200,
      lineWidth: 0.1,
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
      lineColor: 200,
      lineWidth: 0.1,
      minCellHeight: 10 // Extra height for writing
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' }
    },
    margin: { top: 60, right: margin, bottom: 20, left: margin },
  });

  doc.save(`${classInfo.className}_BlankList.pdf`);
};