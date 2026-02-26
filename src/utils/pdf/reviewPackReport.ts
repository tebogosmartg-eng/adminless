"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';

export const generateReviewPackPDF = async (
  name: string,
  classInfo: { className: string; subject: string; grade: string },
  termName: string,
  entries: any[],
  attachments: any[],
  profile: SchoolProfile
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  const startY = addHeader(doc, profile, `Portfolio Review Pack: ${name}`);

  // 1. Pack Metadata
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.setFont("helvetica", "bold");
  doc.text("Class Context:", margin, startY + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`${classInfo.grade} ${classInfo.subject} (${classInfo.className})`, margin + 30, startY + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("Academic Term:", margin, startY + 11);
  doc.setFont("helvetica", "normal");
  doc.text(termName, margin + 30, startY + 11);

  let currentY = startY + 25;

  // 2. Entries Loop
  for (const entry of entries) {
      if (currentY > doc.internal.pageSize.height - 60) {
          addFooter(doc);
          doc.addPage();
          currentY = 25;
      }

      // Entry Header
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(entry.title || "Observation Record", margin + 4, currentY + 6.5);
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      const dateStr = format(new Date(entry.created_at), 'dd MMMM yyyy');
      doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr) - 4, currentY + 6.5);

      currentY += 16;

      // Entry Content
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont("helvetica", "italic");
      const splitContent = doc.splitTextToSize(entry.content || "", pageWidth - (margin * 2) - 8);
      doc.text(splitContent, margin + 4, currentY);
      
      currentY += (splitContent.length * 5) + 10;

      // Attachments List (Textual Audit)
      const entryFiles = attachments.filter(a => a.entry_id === entry.id);
      if (entryFiles.length > 0) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.setFont("helvetica", "bold");
          doc.text("LINKED EVIDENCE:", margin + 4, currentY - 4);
          
          entryFiles.forEach(file => {
              doc.text(`• ${file.file_name}`, margin + 8, currentY);
              currentY += 4;
          });
          currentY += 6;
      }
      
      currentY += 10;
  }

  // 3. Final Sign-off
  addSignatures(doc, currentY);
  addFooter(doc);

  doc.save(`ReviewPack_${classInfo.className}_${name.replace(/\s+/g, '_')}.pdf`);
};