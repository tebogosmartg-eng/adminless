import { ExportData } from './exportData';

export const exportToExcel = (data: ExportData) => {
  const headers = ["Name", ...Object.keys(data.learners[0].marks), "Average", "Symbol", "Comment"];
  const rows = data.learners.map(l => [
    l.name,
    ...Object.values(l.marks),
    l.average,
    l.symbol,
    l.comment
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.metadata.className}_Marks.csv`;
  link.click();
};

export const exportToWord = (data: ExportData) => {
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export</title></head>
    <body>
      <h1>${data.metadata.schoolName}</h1>
      <h2>${data.metadata.className} - ${data.metadata.subject}</h2>
      <table border="1">
        <tr><th>Name</th><th>Average</th><th>Symbol</th></tr>
        ${data.learners.map(l => `<tr><td>${l.name}</td><td>${l.average}</td><td>${l.symbol}</td></tr>`).join('')}
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.metadata.className}_Report.doc`;
  link.click();
};