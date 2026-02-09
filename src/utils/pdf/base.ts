import jsPDF from 'jspdf';
import { format } from 'date-fns';

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
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    doc.text("AdminLess - Professional Academic Management", margin, pageHeight - 10);
    
    const pageStr = `Page ${i} of ${pageCount}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 10);
  }
};