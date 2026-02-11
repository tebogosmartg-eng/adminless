import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiagnosticData } from '@/hooks/useDiagnosticReportData';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { format } from 'date-fns';

export const generateDiagnosticReportPDF = (
  data: DiagnosticData,
  classInfo: { className: string; subject: string; grade: string },
  academicContext: { year: string; term: string; isLocked: boolean },
  profile: SchoolProfile,
  diagnosticSummary: string,
  interventionPlan: string
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const startY = addHeader(doc, profile, "Diagnostic Analysis Report");

  // 1. Header Information
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const infoData = [
    ["Academic Year:", academicContext.year, "Term:", academicContext.term],
    ["Grade:", classInfo.grade, "Class:", classInfo.className],
    ["Subject:", classInfo.subject, "Total Learners:", data.summary.totalLearners.toString()],
    ["Status:", academicContext.isLocked ? "FINALISED" : "DRAFT", "Date:", format(new Date(), 'dd/MM/yyyy')]
  ];

  autoTable(doc, {
    startY: startY + 5,
    body: infoData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 35 }, 
        2: { fontStyle: 'bold', cellWidth: 35 } 
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // 2. Performance Summary
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Summary", margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Class Average', 'Highest Mark', 'Lowest Mark', 'Pass Rate (%)', 'Below Threshold']],
    body: [[
      `${data.summary.classAverage.toFixed(1)}%`,
      `${data.summary.highestMark.toFixed(1)}%`,
      `${data.summary.lowestMark.toFixed(1)}%`,
      `${data.summary.passRate.toFixed(0)}%`,
      data.summary.belowThresholdCount.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    styles: { halign: 'center', fontSize: 10 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Level Distribution
  doc.text("Performance Level Distribution", margin, currentY);
  const distRows = [Object.keys(data.distribution), Object.values(data.distribution)];
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [distRows[0].map(h => `${h}%`)],
    body: [distRows[1]],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9 },
    headStyles: { fillColor: [41, 37, 36], textColor: 255 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Assessment Breakdown
  doc.text("Assessment Breakdown", margin, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Task Title', 'Type', 'Weight', 'Avg %', 'High %', 'Low %']],
    body: data.assessments.map(a => [
      a.title, a.type, `${a.weight}%`, `${a.avg.toFixed(1)}%`, `${a.high.toFixed(1)}%`, `${a.low.toFixed(1)}%`
    ]),
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 5. Narrative Sections
  const addTextBox = (title: string, text: string, y: number) => {
    const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
    if (y + 10 + (splitText.length * 5) > doc.internal.pageSize.height - 40) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(splitText, margin, y + 6);
    return y + 10 + (splitText.length * 5);
  };

  currentY = addTextBox("Diagnostic Analysis & Interpretation", diagnosticSummary, currentY);
  currentY = addTextBox("Intervention Plan", interventionPlan, currentY);

  // 6. Signatures
  addSignatures(doc, currentY);
  addFooter(doc);

  doc.save(`${classInfo.className}_Diagnostic_Report.pdf`);
};