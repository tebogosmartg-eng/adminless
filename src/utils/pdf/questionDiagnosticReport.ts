import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Assessment, Learner, AssessmentMark } from '@/lib/types';
import { QuestionStat } from '@/hooks/useQuestionAnalysis';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { format } from 'date-fns';

export const generateQuestionDiagnosticPDF = (
  assessment: Assessment,
  learners: Learner[],
  qStats: QuestionStat[],
  marks: AssessmentMark[],
  findings: string,
  interventions: string,
  profile: SchoolProfile
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const startY = addHeader(doc, profile, "Assessment Diagnostic & Question Analysis");

  // 1. Meta Details
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Assessment: ${assessment.title}`, margin, startY + 5);
  doc.text(`Type: ${assessment.type}  |  Total Marks: ${assessment.max_mark}`, margin, startY + 10);
  doc.text(`Date: ${assessment.date ? format(new Date(assessment.date), 'dd/MM/yyyy') : 'N/A'}`, pageWidth - margin - 40, startY + 5);

  let currentY = startY + 20;

  // 2. Question Performance Table
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Question-Level Performance Statistics", margin, currentY);

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

  // 3. Narrative Analysis
  const addBlock = (title: string, text: string, y: number) => {
    const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
    if (y + 20 + (splitText.length * 5) > doc.internal.pageSize.height - 40) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(splitText, margin, y + 6);
    return y + 15 + (splitText.length * 5);
  };

  currentY = addBlock("Diagnostic Analysis & Interpretation of Findings", findings, currentY);
  currentY = addBlock("Proposed Intervention Plan & Teacher Action", interventions, currentY);

  // 4. Class Breakdown (Detailed Grid)
  doc.addPage();
  addHeader(doc, profile, "Learner breakdown per question");
  
  const headers = ['#', 'Learner Name'];
  assessment.questions?.forEach(q => headers.push(q.question_number));
  headers.push('Total');

  const body = learners.map((l, i) => {
      const lMark = marks.find(m => m.learner_id === l.id);
      const row: any[] = [i + 1, l.name];
      assessment.questions?.forEach(q => {
          const qScore = lMark?.question_marks?.find(qm => qm.question_id === q.id)?.score;
          row.push(qScore !== undefined ? qScore : "-");
      });
      row.push(lMark?.score || "-");
      return row;
  });

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: body,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fillColor: [100, 116, 139] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 } }
  });

  addSignatures(doc, (doc as any).lastAutoTable.finalY);
  addFooter(doc);

  doc.save(`${assessment.title.replace(/\s+/g, '_')}_Diagnostic.pdf`);
};