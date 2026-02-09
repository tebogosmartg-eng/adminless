import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, GradeSymbol, Assessment, AssessmentMark } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { calculateWeightedAverage } from '../calculations';
import { addHeader, addFooter, SchoolProfile, AttendanceStats } from './base';

export const generateClassPDF = (
  classInfo: ClassInfo, 
  gradingScheme: GradeSymbol[], 
  schoolName: string = "My School", 
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendanceMap?: Record<string, AttendanceStats>,
  isDraft: boolean = true,
  assessments: Assessment[] = [],
  marks: AssessmentMark[] = []
) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  
  const title = isDraft ? "Class Marksheet (WORKING DRAFT)" : "Class Marksheet (OFFICIAL RECORD)";
  const startY = addHeader(doc, profile, title);

  doc.setDrawColor(230);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, startY, pageWidth - (margin * 2), 20, 1, 1, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Subject:", margin + 5, startY + 7);
  doc.text("Grade/Class:", margin + 70, startY + 7);
  doc.text("Status:", margin + 140, startY + 7);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(classInfo.subject, margin + 20, startY + 7);
  doc.text(`${classInfo.grade} - ${classInfo.className}`, margin + 95, startY + 7);
  doc.text(isDraft ? "DRAFT" : "FINALISED", margin + 155, startY + 7);

  const learnerAvgs = classInfo.learners.map(l => l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0);
  const validAvgs = learnerAvgs.filter(a => a > 0);
  
  const classAvg = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(1) : "0.0";
  const highest = validAvgs.length > 0 ? Math.max(...validAvgs).toFixed(1) : "0.0";
  const lowest = validAvgs.length > 0 ? Math.min(...validAvgs).toFixed(1) : "0.0";
  const passCount = validAvgs.filter(a => a >= 50).length;
  const passRate = validAvgs.length > 0 ? Math.round((passCount / validAvgs.length) * 100) : 0;

  const bands = {
    "0-29%": validAvgs.filter(a => a < 30).length,
    "30-39%": validAvgs.filter(a => a >= 30 && a < 40).length,
    "40-49%": validAvgs.filter(a => a >= 40 && a < 50).length,
    "50-59%": validAvgs.filter(a => a >= 50 && a < 60).length,
    "60-69%": validAvgs.filter(a => a >= 60 && a < 70).length,
    "70-79%": validAvgs.filter(a => a >= 70 && a < 80).length,
    "80-100%": validAvgs.filter(a => a >= 80).length,
  };

  doc.setFontSize(11);
  doc.setTextColor(41, 37, 36);
  doc.text("CLASS PERFORMANCE SUMMARY", margin, startY + 30);
  
  autoTable(doc, {
    startY: startY + 33,
    head: [['Learners', 'Class Avg', 'Highest', 'Lowest', 'Pass Rate']],
    body: [[classInfo.learners.length, `${classAvg}%`, `${highest}%`, `${lowest}%`, `${passRate}%`]],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    margin: { left: margin, right: pageWidth - 100 }
  });

  doc.text("MARK DISTRIBUTION", pageWidth / 2, startY + 30);
  autoTable(doc, {
    startY: startY + 33,
    head: [Object.keys(bands)],
    body: [Object.values(bands)],
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    margin: { left: pageWidth / 2, right: margin }
  });

  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("ASSESSMENT BREAKDOWN", margin, currentY);
  
  const assRows = assessments.map(ass => {
      const assMarks = marks.filter(m => m.assessment_id === ass.id && m.score !== null);
      const pcts = assMarks.map(m => (m.score! / ass.max_mark) * 100);
      const avg = pcts.length > 0 ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1) : "-";
      const max = pcts.length > 0 ? Math.max(...pcts).toFixed(1) : "-";
      const min = pcts.length > 0 ? Math.min(...pcts).toFixed(1) : "-";
      return [ass.title, ass.type, ass.max_mark, `${ass.weight}%`, `${avg}%`, `${max}%`, `${min}%` ];
  });

  autoTable(doc, {
      startY: currentY + 3,
      head: [['Task Title', 'Type', 'Max', 'Weight', 'Avg %', 'High %', 'Low %']],
      body: assRows,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 245, 245], textColor: 80 },
  });

  const tableY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("LEARNER PERFORMANCE DATA", margin, tableY);

  const columns = ['#', 'Learner Name'];
  assessments.forEach(ass => columns.push(`${ass.title}\n(${ass.max_mark})`));
  columns.push('Term %');
  columns.push('Level');
  if (attendanceMap) columns.push('Att %');

  const tableRows = classInfo.learners.map((learner, index) => {
    const termAvg = learner.id ? calculateWeightedAverage(assessments, marks, learner.id) : 0;
    const symbolObj = getGradeSymbol(termAvg, gradingScheme);
    const row: any[] = [index + 1, learner.name];
    assessments.forEach(ass => {
        const markEntry = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
        row.push(markEntry && markEntry.score !== null ? markEntry.score : '-');
    });
    row.push(`${termAvg.toFixed(1)}%`);
    row.push(symbolObj ? `${symbolObj.symbol} (L${symbolObj.level})` : '-');
    if (attendanceMap) {
        const stats = learner.id ? attendanceMap[learner.id] : null;
        row.push(stats ? `${stats.rate}%` : '-');
    }
    return row;
  });

  autoTable(doc, {
    startY: tableY + 3,
    head: [columns],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: isDraft ? [100, 116, 139] : [41, 37, 36],
      textColor: 255,
      fontSize: 8,
      halign: 'center'
    },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 45 } },
    margin: { bottom: 20, left: margin, right: margin },
  });

  addFooter(doc);
};