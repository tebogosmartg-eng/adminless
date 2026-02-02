import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from './grading';
import { format } from 'date-fns';

export interface SchoolProfile {
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

/**
 * Standard Header for all PDF documents
 * Ensures consistent branding and contact info layout
 */
export const addHeader = (doc: jsPDF, profile: SchoolProfile, title: string) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  if (profile.logo) {
    try {
      // Standardize logo size and position
      doc.addImage(profile.logo, 'PNG', margin, 10, 25, 25);
    } catch (e) {
      console.warn("Failed to add logo to PDF", e);
    }
  }

  const textX = profile.logo ? margin + 30 : margin;
  
  // School Name
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text(profile.name, textX, 20);

  // Contact Details Subline
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  let contactY = 26;
  if (profile.email || profile.phone) {
      const contactText = [profile.email, profile.phone].filter(Boolean).join("  |  ");
      doc.text(contactText, textX, contactY);
      contactY += 6;
  }

  // Document Title
  doc.setFontSize(14);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text(title, textX, contactY + 4);

  // Teacher Name (Right Aligned in Header)
  if (profile.teacher) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      const teacherStr = `Teacher: ${profile.teacher}`;
      doc.text(teacherStr, pageWidth - margin - doc.getTextWidth(teacherStr), 20);
  }

  // Current Date (Right Aligned)
  const dateStr = `Generated: ${format(new Date(), 'dd/MM/yyyy')}`;
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 26);
  
  // Horizontal line separator
  doc.setDrawColor(230);
  doc.line(margin, 40, pageWidth - margin, 40);

  return 45; // Return Y position where content should begin
};

/**
 * Renders a single learner's report card page
 */
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

  // Header call for consistency
  const startY = addHeader(doc, profile, "Learner Performance Report");

  // Border (Optional for Report Cards to give them a frame)
  doc.setDrawColor(220);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.height - 20);

  // Info Block
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  
  const infoY = startY + 10;
  doc.text("Learner:", margin, infoY);
  doc.text("Grade:", margin, infoY + 8);
  doc.text("Class:", margin + 80, infoY + 8);
  doc.text("Subject:", margin, infoY + 16);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(learner.name, margin + 20, infoY);
  doc.text(classInfo.grade, margin + 20, infoY + 8);
  doc.text(classInfo.className, margin + 95, infoY + 8);
  doc.text(classInfo.subject, margin + 20, infoY + 16);

  // Result Highlight Box
  const resultY = infoY + 30;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, resultY, pageWidth - (margin * 2), 40, 2, 2, 'F');
  
  const symbolObj = getGradeSymbol(learner.mark, gradingScheme);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Final Mark Achieved", pageWidth / 2, resultY + 12, { align: 'center' });
  
  doc.setFontSize(28);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${learner.mark ? learner.mark + '%' : 'N/A'}`, pageWidth / 2, resultY + 25, { align: 'center' });

  if (symbolObj) {
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    doc.text(`Symbol: ${symbolObj.symbol}   |   Level: ${symbolObj.level}`, pageWidth / 2, resultY + 34, { align: 'center' });
  }

  let nextSectionY = resultY + 55;

  // Attendance Section
  if (attendance && attendance.total > 0) {
      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("Attendance Overview", margin, nextSectionY);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      
      const attY = nextSectionY + 10;
      doc.text(`Present: ${attendance.present} / ${attendance.total}`, margin, attY);
      doc.text(`Absent: ${attendance.absent}`, margin + 60, attY);
      doc.text(`Late: ${attendance.late}`, margin + 100, attY);
      
      const rateColor = attendance.rate >= 90 ? [22, 163, 74] : attendance.rate >= 80 ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`Rate: ${attendance.rate}%`, margin + 140, attY);

      nextSectionY += 25;
  }

  // Comments Section
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text("Teacher's Comments", margin, nextSectionY);

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.setFont("helvetica", "italic");
  
  const comment = learner.comment || "No comment recorded.";
  const splitComment = doc.splitTextToSize(comment, pageWidth - (margin * 2));
  doc.text(splitComment, margin, nextSectionY + 10);

  // Signatures
  const footerY = doc.internal.pageSize.height - 40;
  doc.setDrawColor(200);
  doc.line(margin, footerY, margin + 60, footerY);
  doc.line(pageWidth - margin - 60, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Teacher Signature", margin, footerY + 5);
  doc.text("Parent/Guardian Signature", pageWidth - margin - 60, footerY + 5);
  
  doc.setFontSize(8);
  doc.text("Generated by AdminLess", pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
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
  
  const startY = addHeader(doc, profile, "Class Performance Report");

  // Summary Banner
  doc.setDrawColor(230);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, startY + 5, pageWidth - (margin * 2), 20, 1, 1, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Subject:", margin + 5, startY + 12);
  doc.text("Grade/Class:", margin + 70, startY + 12);
  doc.text("Total Learners:", margin + 140, startY + 12);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(classInfo.subject, margin + 20, startY + 12);
  doc.text(`${classInfo.grade} - ${classInfo.className}`, margin + 95, startY + 12);
  doc.text(classInfo.learners.length.toString(), margin + 165, startY + 12);

  const marks = classInfo.learners
    .map(l => parseFloat(l.mark))
    .filter(m => !isNaN(m));
  
  const average = marks.length > 0 
    ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) 
    : "N/A";
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Class Average:", margin + 5, startY + 18);
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${average}%`, margin + 30, startY + 18);

  const columns = ['#', 'Learner Name', 'Mark', 'Symbol', 'Level'];
  if (attendanceMap) columns.push('Att %');
  columns.push('Teacher Observation');

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
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: attendanceMap ? 40 : 50, fontStyle: 'bold' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: attendanceMap ? 15 : 'auto', halign: attendanceMap ? 'center' : 'left' },
      6: { cellWidth: 'auto', fontStyle: 'italic', fontSize: 8 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    margin: { top: 45, right: margin, bottom: 20, left: margin },
  });

  doc.save(`${classInfo.className}_Class_Report.pdf`);
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

  const startY = addHeader(doc, profile, "Mark Recording Sheet");

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Subject: ${classInfo.subject}  |  Class: ${classInfo.className}  |  Grade: ${classInfo.grade}`, margin, startY + 8);
  doc.text(`Date: _______________________    Task: __________________________________________`, margin, startY + 16);

  const tableRows = classInfo.learners.map((learner, index) => [
    index + 1,
    learner.name,
    '',
    '',
  ]);

  autoTable(doc, {
    startY: startY + 22,
    head: [['#', 'Learner Name', 'Mark / Score', 'Notes / Observations']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 245, 245], textColor: 40, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4, minCellHeight: 10 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 70, fontStyle: 'bold' }, 2: { cellWidth: 30 } },
    margin: { top: 45, right: margin, bottom: 20, left: margin },
  });

  doc.save(`${classInfo.className}_Blank_Register.pdf`);
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
  doc.save(`${learner.name.replace(/\s+/g, '_')}_Report.pdf`);
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

  doc.save(`${classInfo.className}_Term_Reports.pdf`);
};