import jsPDF from 'jspdf';
import { Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { addHeader, addFooter, SchoolProfile, AttendanceStats } from './base';

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
      
      const attY = nextSectionY + 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
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