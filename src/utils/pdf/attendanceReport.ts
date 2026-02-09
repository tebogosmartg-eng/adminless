import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWeekend } from 'date-fns';
import { Learner } from '@/lib/types';
import { addHeader, addFooter, SchoolProfile } from './base';

export const generateAttendancePDF = (
    learners: Learner[],
    recordMap: Record<string, Record<string, string>>,
    dates: string[],
    monthName: string,
    profile: SchoolProfile
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const startY = addHeader(doc, profile, `Attendance Register: ${monthName}`);
    
    const head = [['Name', ...dates.map(d => format(new Date(d), 'dd')), 'P', 'A', 'L']];
    const body = learners.map(l => {
       if (!l.id) return [];
       const records = recordMap[l.id] || {};
       let present = 0, absent = 0, late = 0;
       
       const statuses = dates.map(d => {
          const s = records[d];
          if (s === 'present') { present++; return 'P'; }
          if (s === 'absent') { absent++; return 'A'; }
          if (s === 'late') { late++; return 'L'; }
          if (s === 'excused') return 'E';
          return '-';
       });
       
       return [l.name, ...statuses, present, absent, late];
    }).filter(row => row.length > 0);

    autoTable(doc, {
      startY: startY + 5,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [41, 37, 36], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
      didParseCell: (data) => {
          if (data.section === 'head' && data.column.index > 0 && data.column.index <= dates.length) {
              const dateStr = dates[data.column.index - 1];
              if (isWeekend(new Date(dateStr))) {
                  data.cell.styles.fillColor = [100, 100, 100];
              }
          }
          if (data.section === 'body' && data.column.index > 0 && data.column.index <= dates.length) {
              const dateStr = dates[data.column.index - 1];
              if (isWeekend(new Date(dateStr))) {
                  data.cell.styles.fillColor = [240, 240, 240];
              }
              const status = data.cell.text[0];
              if (status === 'P') data.cell.styles.textColor = [22, 163, 74];
              if (status === 'A') data.cell.styles.textColor = [220, 38, 38];
              if (status === 'L') data.cell.styles.textColor = [217, 119, 6];
          }
      }
    });
    
    addFooter(doc);
    doc.save(`Attendance_${monthName.replace(/\s+/g, '_')}.pdf`);
};