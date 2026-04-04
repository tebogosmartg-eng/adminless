import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo } from '@/lib/types';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { t } from '@/lib/useTranslation';

export const generateBlankClassListPDF = (
  classInfo: ClassInfo,
  schoolName: string = "My School",
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  lang: string = 'en'
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  const margin = 14;

  const startY = addHeader(doc, profile, "Formal Assessment Recording Sheet");

  // Detailed Metadata lines for handwritten input
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.setFont("helvetica", "bold");
  doc.text("Class Context:", margin, startY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(`${classInfo.subject}  |  ${classInfo.className}  |  ${classInfo.grade}`, margin + 30, startY + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("Task Name:", margin, startY + 16);
  doc.line(margin + 30, startY + 17, margin + 110, startY + 17);
  
  doc.text(`${t('date', lang)}:`, margin + 120, startY + 16);
  doc.line(margin + 135, startY + 17, margin + 180, startY + 17);

  const tableRows = classInfo.learners.map((learner, index) => [
    index + 1,
    learner.name,
    '',
    '',
  ]);

  autoTable(doc, {
    startY: startY + 25,
    head: [['#', t('learnerName', lang), 'Mark / Score', 'Internal Moderation Notes']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 245, 245], textColor: 40, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4, minCellHeight: 12 },
    columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 30 },
        3: { cellWidth: 60 }
    }
  });

  const lastY = (doc as any).lastAutoTable.finalY;
  addSignatures(doc, lastY);

  addFooter(doc);
  doc.save(`${classInfo.className}_Blank_Register.pdf`);
};