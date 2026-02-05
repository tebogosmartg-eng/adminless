import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, Learner, GradeSymbol, AttendanceRecord } from '@/lib/types';
import { getGradeSymbol } from './grading';
import { format, isWeekend } from 'date-fns';

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
 */
export const addHeader = (doc: jsPDF, profile: SchoolProfile, title: string) => {
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
      const contactText = [profile.email, profile.phone].filter(Boolean).join("  |  ");
      doc.text(contactText, textX, contactY);
      contactY += 6;
  }

  doc.setFontSize(14);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text(title, textX, contactY + 4);

  if (profile.teacher) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      const teacherStr = `Teacher: ${profile.teacher}`;
      doc.text(teacherStr, pageWidth - margin - doc.getTextWidth(teacherStr), 20);
  }

  const dateStr = `Generated: ${format(new Date(), 'dd/MM/yyyy')}`;
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 26);
  
  doc.setDrawColor(230);
  doc.line(margin, 40, pageWidth - margin, 40);

  return 45;
};

/**
 * Standard Footer for all PDF documents
 */
export const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Line separator
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    
    // Left side
    doc.text("AdminLess - Professional Academic Management", margin, pageHeight - 10);
    
    // Right side (Page numbers)
    const pageStr = `Page ${i} of ${pageCount}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 10);
  }
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

  const startY = addHeader(doc, profile, "Learner Performance Report");

  doc.setDrawColor(220);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.height - 20);

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

  const footerY = doc.internal.pageSize.height - 40;
  doc.setDrawColor(200);
  doc.line(margin, footerY, margin + 60, footerY);
  doc.line(pageWidth - margin - 60, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Teacher Signature", margin, footerY + 5);
  doc.text("Parent/Guardian Signature", pageWidth - margin - 60, footerY + 5);
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
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    margin: { top: 45, right: margin, bottom: 20, left: margin },
  });

  addFooter(doc);
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
    margin: { top: 45, right: margin, bottom: 20, left: margin },
  });

  addFooter(doc);
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
  addFooter(doc);
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

  addFooter(doc);
  doc.save(`${classInfo.className}_Term_Reports.pdf`);
};

/**
 * Generates a monthly attendance register PDF
 */
export const generateAttendancePDF = (
    learners: Learner[],
    recordMap: Record<string, Record<string, string>>,
    dates: string[],
    monthName: string,
    profile: SchoolProfile
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const startY = addHeader(doc, profile, `Attendance Register: ${monthName}`);
    
    const head = [['Name', ...dates.map(d => format(new Date(d), 'dd')), 'P', 'A', 'L']];
    const body = learners.map(l => {
       if (!l.id) return [];
       const records = recordMap[l.id] || {};
       let present = 0, absent = 0, late = 0;
       
       const statuses = dates.map(d => {
          const s = records[d];
          if (s === 'present') { present++; return 'P'; }
          if (s === 'absent') { absent++; return 'A'; }
          if (s === 'late') { late++; return 'L'; }
          if (s === 'excused') return 'E';
          return '-';
       });
       
       return [l.name, ...statuses, present, absent, late];
    }).filter(row => row.length > 0);

    autoTable(doc, {
      startY: startY + 5,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [41, 37, 36], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
      didParseCell: (data) => {
          if (data.section === 'head' && data.column.index > 0 && data.column.index <= dates.length) {
              const dateStr = dates[data.column.index - 1];
              if (isWeekend(new Date(dateStr))) {
                  data.cell.styles.fillColor = [100, 100, 100];
              }
          }
          if (data.section === 'body' && data.column.index > 0 && data.column.index <= dates.length) {
              const dateStr = dates[data.column.index - 1];
              if (isWeekend(new Date(dateStr))) {
                  data.cell.styles.fillColor = [240, 240, 240];
              }
              // Status coloring
              const status = data.cell.text[0];
              if (status === 'P') data.cell.styles.textColor = [22, 163, 74];
              if (status === 'A') data.cell.styles.textColor = [220, 38, 38];
              if (status === 'L') data.cell.styles.textColor = [217, 119, 6];
          }
      }
    });
    
    addFooter(doc);
    doc.save(`Attendance_${monthName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Generates a term-wide performance summary PDF
 */
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