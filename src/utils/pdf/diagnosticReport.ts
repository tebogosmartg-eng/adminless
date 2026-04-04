import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiagnosticData } from '@/hooks/useDiagnosticReportData';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { format } from 'date-fns';
import { t } from '@/lib/useTranslation';

export const generateDiagnosticReportPDF = (
  data: DiagnosticData,
  classInfo: { className: string; subject: string; grade: string },
  academicContext: { year: string; term: string; isLocked: boolean },
  profile: SchoolProfile,
  diagnosticSummary: string,
  interventionPlan: string,
  returnBlob: boolean = false,
  lang: string = 'en'
): Blob | void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const startY = addHeader(doc, profile, t('diagnosticReport', lang));

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const infoData = [
    ["Academic Year:", academicContext.year, `${t('term', lang)}:`, academicContext.term],
    [`${t('grade', lang)}:`, classInfo.grade, `${t('class', lang)}:`, classInfo.className],
    [`${t('subject', lang)}:`, classInfo.subject, `${t('totalLearners', lang)}:`, data.summary.totalLearners.toString()],
    [`${t('status', lang)}:`, academicContext.isLocked ? "FINALISED" : "DRAFT", `${t('date', lang)}:`, format(new Date(), 'dd/MM/yyyy')]
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

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Summary", margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [[t('classAverage', lang), t('highestMark', lang), t('lowestMark', lang), `${t('passRate', lang)} (%)`, 'Below Threshold']],
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

  doc.text(t('assessmentAnalysis', lang), margin, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [[t('title', lang), t('type', lang), t('weight', lang), t('avgPercent', lang), t('highestPercent', lang), t('lowestPercent', lang)]],
    body: data.assessments.map(a => [
      a.title, a.type, `${a.weight}%`, `${a.avg.toFixed(1)}%`, `${a.high.toFixed(1)}%`, `${a.low.toFixed(1)}%`
    ]),
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

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

  currentY = addTextBox("Diagnostic Analysis & Interpretation", diagnosticSummary || "Auto-generated report.", currentY);
  currentY = addTextBox("Intervention Plan", interventionPlan || "No interventions outlined.", currentY);

  addSignatures(doc, currentY);
  addFooter(doc);

  if (returnBlob) {
      return doc.output('blob');
  }

  doc.save(`${classInfo.className}_Diagnostic_Report.pdf`);
};