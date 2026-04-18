import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Assessment, Learner, AssessmentMark, DiagnosticRow } from '@/lib/types';
import { QuestionStat } from '@/hooks/useQuestionAnalysis';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { format } from 'date-fns';
import { t, translateText } from '@/lib/useTranslation';

export const generateQuestionDiagnosticPDF = async (
  assessment: Assessment,
  learners: Learner[],
  qStats: QuestionStat[],
  marks: AssessmentMark[],
  diagRows: DiagnosticRow[],
  profile: SchoolProfile,
  lang: string = 'en'
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const startY = addHeader(doc, profile, `${t('assessment', lang)} ${t('diagnosticReport', lang)} & Item Analysis`);

  // 1. Meta Details
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${t('assessment', lang)}: ${assessment.title}`, margin, startY + 5);
  doc.text(`${t('type', lang)}: ${assessment.type}  |  ${t('total', lang)}: ${assessment.max_mark}`, margin, startY + 10);
  doc.text(`${t('date', lang)}: ${assessment.date ? format(new Date(assessment.date), 'dd/MM/yyyy') : 'N/A'}`, pageWidth - margin - 40, startY + 5);

  let currentY = startY + 20;

  // 2. Question Performance Table
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Item Analysis Statistics", margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Q#', 'Skill/Topic', 'Max', 'Avg %', 'High', 'Low', 'Pass %']],
    body: qStats.map(s => [
        s.number, 
        s.skill || "-", 
        s.max, 
        `${s.avg}%`, 
        s.high, 
        s.low, 
        `${s.passRate}%`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [41, 37, 36], textColor: 255 },
    styles: { fontSize: 8, halign: 'center' },
    columnStyles: { 1: { halign: 'left', cellWidth: 50 } },
    didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
            const val = parseFloat(data.cell.text[0]);
            if (val < 50) data.cell.styles.textColor = [220, 38, 38];
        }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Tabular Analysis (New Deep Format)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Deep Root-Cause Analysis & Interventions", margin, currentY);

  const translatedBody = [];
  for (const r of diagRows) {
      const summary = await translateText(r.performance_summary, lang);
      
      const causes = [];
      for (const c of r.possible_root_causes) {
          if (c.trim()) {
              const tc = await translateText(c.trim(), lang);
              causes.push(`• ${tc}`);
          }
      }
      
      const interventions = [];
      for (const i of r.targeted_interventions) {
          if (i.trim()) {
              const ti = await translateText(i.trim(), lang);
              interventions.push(`• ${ti}`);
          }
      }
      
      translatedBody.push([
          r.question,
          summary,
          causes.join('\n'),
          interventions.join('\n')
      ]);
  }

  autoTable(doc, {
      startY: currentY + 3,
      head: [['Question', 'Summary', 'Possible Root Causes', 'Targeted Interventions']],
      body: translatedBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 55 },
          3: { cellWidth: 55 }
      }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Class Breakdown (Detailed Grid)
  if (currentY > doc.internal.pageSize.height - 100) {
      doc.addPage();
      addHeader(doc, profile, `${t('learner', lang)} ${t('performance', lang)} Breakdown`);
      currentY = 45;
  } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Individual ${t('learner', lang)} Records`, margin, currentY);
      currentY += 3;
  }
  
  const headers = ['#', t('learnerName', lang)];
  assessment.questions?.forEach(q => headers.push(`Q${q.question_number}`));
  headers.push(t('total', lang));

  const body = learners.map((l, i) => {
      const lMark = marks.find(m => m.learner_id === l.id);
      const row: any[] = [i + 1, l.name];
      assessment.questions?.forEach(q => {
          const qScore = lMark?.question_marks?.[q.id];
          row.push(qScore !== undefined && qScore !== null ? qScore : "-");
      });
      row.push(lMark?.score || "-");
      return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: body,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fillColor: [100, 116, 139] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 } }
  });

  addSignatures(doc, (doc as any).lastAutoTable.finalY);
  addFooter(doc);

  doc.save(`${assessment.title.replace(/\s+/g, '_')}_RootCause_Analysis.pdf`);
};