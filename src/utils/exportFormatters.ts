import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel } from 'docx';
import { ExportData } from './exportData';

export const exportToExcel = (data: ExportData) => {
  const worksheetData = data.learners.map(l => ({
    Name: l.name,
    ...l.marks,
    Average: l.average,
    Symbol: l.symbol,
    Comment: l.comment
  }));

  const ws = XLSX.utils.json_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Marks");
  XLSX.writeFile(wb, `${data.metadata.className}_Marks.xlsx`);
};

export const exportToWord = async (data: ExportData) => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: data.metadata.schoolName, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `${data.metadata.className} - ${data.metadata.subject}`, heading: HeadingLevel.HEADING_2 }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Name")] }),
                new TableCell({ children: [new Paragraph("Average")] }),
                new TableCell({ children: [new Paragraph("Symbol")] }),
              ]
            }),
            ...data.learners.map(l => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(l.name)] }),
                new TableCell({ children: [new Paragraph(l.average)] }),
                new TableCell({ children: [new Paragraph(l.symbol)] }),
              ]
            }))
          ]
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.metadata.className}_Report.docx`;
  link.click();
};