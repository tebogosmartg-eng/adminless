import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo } from '@/lib/types';
import { addHeader, addFooter, SchoolProfile } from './base';

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