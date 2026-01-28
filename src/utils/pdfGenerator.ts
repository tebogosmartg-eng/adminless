import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from './grading';
import { format } from 'date-fns';

interface SchoolProfile {
  name: string;
  teacher: string;
  logo: string | null;
  email: string;
  phone: string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

const addHeader = (doc: jsPDF, profile: SchoolProfile, title: string) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  if (profile.logo) {
    try {
      doc.addImage(profile.logo, 'PNG', margin, 10, 25, 25);
    } catch (e) {
      console.warn("Failed to add logo to PDF", e);
    }
  }

  const textX = profile.logo ? margin + 30 : margin;
  
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text(profile.name, textX, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  let contactY = 26;
  if (profile.email || profile.phone) {
      const contactText = [profile.email, profile.phone].filter(Boolean).join(" | ");
      doc.text(contactText, textX, contactY);
      contactY += 6;
  }

  doc.setFontSize(14);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text(title, textX, contactY + 4);
  
  // Return Y position where header ends
  return contactY + 10;
};

const addLearnerReportPage = (
  doc: jsPDF,
  learner: Learner,
  classInfo: { subject: string; grade: string; className: string },
  gradingScheme: GradeSymbol[],
  profile: SchoolProfile,
  attendance?: AttendanceStats
) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  doc.setDrawColor(41, 37, 36);
  doc.setLineWidth(1);
  doc.rect(margin, margin, pageWidth - (margin * 2), 257);

  if (profile.logo) {
     try {
       const logoSize = 30;
       const logoX = (pageWidth - logoSize) / 2;
       doc.addImage(profile.logo, 'PNG', logoX, 30, logoSize, logoSize);
     } catch (e) {}
  }

  const textStartY = profile.logo ? 70 : 40;
  
  doc.setFontSize(24);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text(profile.name, pageWidth / 2, textStartY, { align: 'center' });

  // Contact info
  if (profile.email || profile.phone) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    const contactText = [profile.email, profile.phone].filter(Boolean).join(" • ");
    doc.text(contactText, pageWidth / 2, textStartY + 6, { align: 'center' });
  }
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Learner Performance Report", pageWidth / 2, textStartY + 16, { align: 'center' });

  doc.setDrawColor(200);
  doc.line(margin + 20, textStartY + 26, pageWidth - (margin + 20), textStartY + 26);

  const startY = textStartY + 45;
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text("Learner Name:", margin + 20, startY);
  doc.text("Grade:", margin + 20, startY + 10);
  doc.text("Class:", margin + 20, startY + 20);
  doc.text("Subject:", margin + 20, startY + 30);
  if (profile.teacher) {
    doc.text("Teacher:", margin + 20, startY + 40);
  }

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(learner.name, margin + 60, startY);
  doc.text(classInfo.grade, margin + 60, startY + 10);
  doc.text(classInfo.className, margin + 60, startY + 20);
  doc.text(classInfo.subject, margin + 60, startY + 30);
  if (profile.teacher) {
    doc.text(profile.teacher, margin + 60, startY + 40);
  }

  const resultY = startY + 60;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin + 10, resultY, pageWidth - (margin * 2) - 20, 50, 3, 3, 'F');
  
  const symbolObj = getGradeSymbol(learner.mark, gradingScheme);
  
  doc.setFontSize(16);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("Mark Achieved", pageWidth / 2, resultY + 15, { align: 'center' });
  
  doc.setFontSize(32);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${learner.mark ? learner.mark + '%' : 'N/A'}`, pageWidth / 2, resultY + 30, { align: 'center' });

  if (symbolObj) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Symbol: ${symbolObj.symbol}   |   Level: ${symbolObj.level}`, pageWidth / 2, resultY + 42, { align: 'center' });
  }

  let nextSectionY = resultY + 65;

  // Attendance Section
  if (attendance && attendance.total > 0) {
      doc.setFontSize(14);
      doc.setTextColor(41, 37, 36);
      doc.setFont("helvetica", "bold");
      doc.text("Attendance Overview", margin + 20, nextSectionY);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      
      const attY = nextSectionY + 10;
      doc.text(`Present: ${attendance.present} / ${attendance.total}`, margin + 20, attY);
      doc.text(`Absent: ${attendance.absent}`, margin + 80, attY);
      doc.text(`Late: ${attendance.late}`, margin + 120, attY);
      
      // Attendance Rate
      doc.setFont("helvetica", "bold");
      const rateColor = attendance.rate >= 90 ? [22, 163, 74] : attendance.rate >= 80 ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
      doc.text(`Attendance Rate: ${attendance.rate}%`, margin + 160, attY);

      nextSectionY += 25;
  }

  const commentY = nextSectionY;
  doc.setFontSize(14);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text("Teacher's Comments", margin + 20, commentY);

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.setFont("helvetica", "italic");
  
  const comment = learner.comment || "No comment recorded.";
  const splitComment = doc.splitTextToSize(comment, pageWidth - (margin * 2) - 40);
  doc.text(splitComment, margin + 20, commentY + 10);

  const footerY = 240;
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, footerY, margin + 80, footerY);
  doc.line(pageWidth - margin - 80, footerY, pageWidth - margin - 20, footerY);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Teacher Signature", margin + 20, footerY + 5);
  doc.text("Date", pageWidth - margin - 80, footerY + 5);
  
  doc.text("Generated by SmaReg", pageWidth / 2, 270, { align: 'center' });
};

export const generateClassPDF = (
  classInfo: ClassInfo, 
  gradingScheme: GradeSymbol[], 
  schoolName: string = "My School", 
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendanceMap?: Record<string, AttendanceStats>
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  const headerBottomY = addHeader(doc, profile, "Class Performance Report");

  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = format(new Date(), 'dd/MM/yyyy');
  doc.text(`Generated on: ${dateStr}`, pageWidth - margin - doc.getTextWidth(`Generated on: ${dateStr}`), 20);
  
  if (teacherName) {
    doc.text(`Teacher: ${teacherName}`, pageWidth - margin - doc.getTextWidth(`Teacher: ${teacherName}`), 26);
  }

  const startY = headerBottomY + 10;
  
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

  const columns = ['#', 'Learner Name', 'Mark', 'Symbol', 'Level'];
  if (attendanceMap) columns.push('Attendance');
  columns.push('Comment');

  const tableRows = classInfo.learners.map((learner, index) => {
    const symbolObj = getGradeSymbol(learner.mark, gradingScheme);
    const row = [
      index + 1,
      learner.name,
      learner.mark ? `${learner.mark}%` : '-',
      symbolObj ? symbolObj.symbol : '-',
      symbolObj ? `L${symbolObj.level}` : '-',
    ];

    if (attendanceMap) {
        const stats = learner.id ? attendanceMap[learner.id] : null;
        row.push(stats ? `${stats.rate}%` : '-');
    }

    row.push(learner.comment || '-');
    return row;
  });

  autoTable(doc, {
    startY: startY + 30,
    head: [columns],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 37, 36],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: attendanceMap ? 45 : 50, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: attendanceMap ? 25 : 'auto', halign: attendanceMap ? 'center' : 'left', fontStyle: attendanceMap ? 'normal' : 'italic' },
      6: { cellWidth: 'auto', fontStyle: 'italic' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249]
    },
    margin: { top: 65, right: margin, bottom: 20, left: margin },
  });

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

  doc.save(`${classInfo.className}_${classInfo.subject}_Report.pdf`);
};

export const generateBlankClassListPDF = (
  classInfo: ClassInfo,
  schoolName: string = "My School", 
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = ""
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  const margin = 14;

  const headerBottomY = addHeader(doc, profile, "Mark Recording Sheet");

  const startY = headerBottomY + 10;
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

  const tableRows = classInfo.learners.map((learner, index) => [
    index + 1,
    learner.name,
    '',
    '',
  ]);

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
      minCellHeight: 10
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

export const generateLearnerReportPDF = (
  learner: Learner,
  classInfo: { subject: string; grade: string; className: string },
  gradingScheme: GradeSymbol[],
  schoolName: string = "My School",
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendance?: AttendanceStats
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  addLearnerReportPage(doc, learner, classInfo, gradingScheme, profile, attendance);
  doc.save(`${learner.name}_Report.pdf`);
};

export const generateBulkLearnerReportsPDF = (
  learners: Learner[],
  classInfo: { subject: string; grade: string; className: string },
  gradingScheme: GradeSymbol[],
  schoolName: string = "My School",
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendanceMap?: Record<string, AttendanceStats>
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };

  learners.forEach((learner, index) => {
    if (index > 0) doc.addPage();
    const stats = learner.id && attendanceMap ? attendanceMap[learner.id] : undefined;
    addLearnerReportPage(doc, learner, classInfo, gradingScheme, profile, stats);
  });

  doc.save(`${classInfo.className}_All_Reports.pdf`);
};