import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, GradeSymbol, Assessment, AssessmentMark, AcademicYear } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { calculateWeightedAverage } from '../calculations';
import { addHeader, addFooter, addSignatures, SchoolProfile, AttendanceStats } from './base';

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
  marks: AssessmentMark[] = [],
  activeYear?: AcademicYear | null,
  atRiskThreshold: number = 50
) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  
  const title = isDraft ? "Class Marksheet (WORKING DRAFT)" : "Class Marksheet (OFFICIAL RECORD)";
  const startY = addHeader(doc, profile, title);

  // Metadata Box
  doc.setDrawColor(230);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, startY, pageWidth - (margin * 2), 20, 1, 1, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Year:", margin + 5, startY + 7);
  doc.text("Subject:", margin + 45, startY + 7);
  doc.text("Grade/Class:", margin + 110, startY + 7);
  doc.text("Status:", margin + 180, startY + 7);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(activeYear?.name || "N/A", margin + 15, startY + 7);
  doc.text(classInfo.subject, margin + 60, startY + 7);
  doc.text(`${classInfo.grade} - ${classInfo.className}`, margin + 135, startY + 7);
  doc.text(isDraft ? "DRAFT" : "FINALISED", margin + 195, startY + 7);

  // Calculations
  const learnerData = classInfo.learners.map(l => {
    const avg = l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0;
    return { ...l, avg };
  });

  const validAvgs = learnerData.map(l => l.avg).filter(a => a > 0);
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

  // Performance Summary
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

  // At Risk Learners
  const atRiskList = learnerData.filter(l => l.avg > 0 && l.avg < atRiskThreshold);
  if (atRiskList.length > 0) {
      const atRiskY = (doc as any).lastAutoTable.finalY + 10;
      doc.setTextColor(220, 38, 38);
      doc.text("INTERVENTION REQUIRED (At-Risk Learners)", margin, atRiskY);
      doc.setTextColor(41, 37, 36);

      const riskRows = [];
      for (let i = 0; i < atRiskList.length; i += 3) {
          riskRows.push([
              atRiskList[i] ? `${atRiskList[i].name} (${atRiskList[i].avg}%)` : "",
              atRiskList[i+1] ? `${atRiskList[i+1].name} (${atRiskList[i+1].avg}%)` : "",
              atRiskList[i+2] ? `${atRiskList[i+2].name} (${atRiskList[i+2].avg}%)` : ""
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

  // Assessment Breakdown
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
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

  // Main Marksheet
  const tableY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("LEARNER PERFORMANCE DATA", margin, tableY);

  const columns = ['#', 'Learner Name'];
  assessments.forEach(ass => columns.push(`${ass.title}\n(${ass.max_mark})`));
  columns.push('Term %');
  columns.push('Level');
  if (attendanceMap) columns.push('Att %');

  const tableRows = learnerData.map((learner, index) => {
    const symbolObj = getGradeSymbol(learner.avg, gradingScheme);
    const row: any[] = [index + 1, learner.name];
    assessments.forEach(ass => {
        const markEntry = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
        row.push(markEntry && markEntry.score !== null ? markEntry.score : '-');
    });
    row.push(`${learner.avg.toFixed(1)}%`);
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
    didParseCell: (data) => {
        // Red alert for failing marks
        if (data.section === 'body') {
            const valStr = data.cell.text[0];
            if (valStr.includes('%')) {
                const val = parseFloat(valStr);
                if (val > 0 && val < atRiskThreshold) {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    }
  });

  // Final Audit Sign-off
  const lastY = (doc as any).lastAutoTable.finalY;
  addSignatures(doc, lastY);

  addFooter(doc);
};