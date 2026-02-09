import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClassInfo, GradeSymbol, Assessment, AssessmentMark, AcademicYear } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { calculateWeightedAverage } from '../calculations';
import { addHeader, addFooter, addSignatures, SchoolProfile, AttendanceStats } from './base';

export const generateClassPDF = (
  classInfo: ClassInfo, 
  gradingScheme: GradeSymbol[], 
  schoolName: string = "My School", 
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendanceMap?: Record<string, AttendanceStats>,
  isDraft: boolean = true,
  assessments: Assessment[] = [],
  marks: AssessmentMark[] = [],
  activeYear?: AcademicYear | null,
  atRiskThreshold: number = 50
) => {
  try {
    const doc = new jsPDF('l', 'mm', 'a4');
    const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
    const margin = 14;
    const pageWidth = doc.internal.pageSize.width;
    
    const title = isDraft ? "Class Marksheet (WORKING DRAFT)" : "Class Marksheet (OFFICIAL RECORD)";
    let currentY = addHeader(doc, profile, title);

    // Metadata Box
    doc.setDrawColor(230);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 1, 1, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Year:", margin + 5, currentY + 7);
    doc.text("Subject:", margin + 45, currentY + 7);
    doc.text("Grade/Class:", margin + 110, currentY + 7);
    doc.text("Status:", margin + 180, currentY + 7);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(activeYear?.name || "N/A", margin + 15, currentY + 7);
    doc.text(classInfo.subject || "N/A", margin + 60, currentY + 7);
    doc.text(`${classInfo.grade || 'N/A'} - ${classInfo.className || 'N/A'}`, margin + 135, currentY + 7);
    doc.text(isDraft ? "DRAFT" : "FINALISED", margin + 195, currentY + 7);

    currentY += 30;

    // --- CALCULATIONS ---
    const learnerData = (classInfo.learners || []).map(l => {
        const avg = l.id ? calculateWeightedAverage(assessments, marks, l.id) : 0;
        return { ...l, avg };
    });

    const validAvgs = learnerData.map(l => l.avg).filter(a => a > 0);
    const classAvg = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(1) : "0.0";
    const highest = validAvgs.length > 0 ? Math.max(...validAvgs).toFixed(1) : "0.0";
    const lowest = validAvgs.length > 0 ? Math.min(...validAvgs).toFixed(1) : "0.0";
    const passCount = validAvgs.filter(a => a >= 50).length;
    const passRate = validAvgs.length > 0 ? Math.round((passCount / validAvgs.length) * 100) : 0;

    const bands = {
        "0-29%": validAvgs.filter(a => a < 30).length,
        "30-39%": validAvgs.filter(a => a >= 30 && a < 40).length,
        "40-49%": validAvgs.filter(a => a >= 40 && a < 50).length,
        "50-59%": validAvgs.filter(a => a >= 50 && a < 60).length,
        "60-69%": validAvgs.filter(a => a >= 60 && a < 70).length,
        "70-79%": validAvgs.filter(a => a >= 70 && a < 80).length,
        "80-100%": validAvgs.filter(a => a >= 80).length,
    };

    // --- SUMMARY TABLES ---
    doc.setFontSize(11);
    doc.setTextColor(41, 37, 36);
    doc.text("CLASS PERFORMANCE SUMMARY", margin, currentY);
    
    autoTable(doc, {
        startY: currentY + 3,
        head: [['Learners', 'Class Avg', 'Highest', 'Lowest', 'Pass Rate']],
        body: [[learnerData.length, `${classAvg}%`, `${highest}%`, `${lowest}%`, `${passRate}%`]],
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { left: margin, right: pageWidth - 100 }
    });

    doc.text("MARK DISTRIBUTION", pageWidth / 2, currentY);
    autoTable(doc, {
        startY: currentY + 3,
        head: [Object.keys(bands)],
        body: [Object.values(bands)],
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { left: pageWidth / 2, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- AT RISK SECTION ---
    const atRiskList = learnerData.filter(l => l.avg > 0 && l.avg < atRiskThreshold);
    if (atRiskList.length > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text("INTERVENTION REQUIRED (At-Risk Learners)", margin, currentY);
        doc.setTextColor(41, 37, 36);

        const riskRows = [];
        for (let i = 0; i < atRiskList.length; i += 3) {
            riskRows.push([
                atRiskList[i] ? `${atRiskList[i].name} (${atRiskList[i].avg.toFixed(1)}%)` : "",
                atRiskList[i+1] ? `${atRiskList[i+1].name} (${atRiskList[i+1].avg.toFixed(1)}%)` : "",
                atRiskList[i+2] ? `${atRiskList[i+2].name} (${atRiskList[i+2].avg.toFixed(1)}%)` : ""
            ]);
        }

        autoTable(doc, {
            startY: currentY + 3,
            body: riskRows,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            margin: { left: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- ASSESSMENT BREAKDOWN ---
    if (assessments.length > 0) {
        doc.setFontSize(11);
        doc.text("ASSESSMENT BREAKDOWN", margin, currentY);
        
        const assRows = assessments.map(ass => {
            const assMarks = marks.filter(m => m.assessment_id === ass.id && m.score !== null);
            const pcts = assMarks.map(m => (Number(m.score) / ass.max_mark) * 100);
            const avg = pcts.length > 0 ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1) : "-";
            const max = pcts.length > 0 ? Math.max(...pcts).toFixed(1) : "-";
            const min = pcts.length > 0 ? Math.min(...pcts).toFixed(1) : "-";
            return [ass.title, ass.type, ass.max_mark, `${ass.weight}%`, `${avg}%`, `${max}%`, `${min}%` ];
        });

        autoTable(doc, {
            startY: currentY + 3,
            head: [['Task Title', 'Type', 'Max', 'Weight', 'Avg %', 'High %', 'Low %']],
            body: assRows,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [245, 245, 245], textColor: 80 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- MAIN LEARNER TABLE ---
    doc.text("LEARNER PERFORMANCE DATA", margin, currentY);

    const tableHeaders = ['#', 'Learner Name'];
    assessments.forEach(ass => tableHeaders.push(`${ass.title}\n(${ass.max_mark})`));
    tableHeaders.push('Term %');
    tableHeaders.push('Level');
    if (attendanceMap) tableHeaders.push('Att %');

    const tableBody = learnerData.map((learner, index) => {
        const symbolObj = getGradeSymbol(learner.avg, gradingScheme);
        const row: any[] = [index + 1, learner.name];
        
        assessments.forEach(ass => {
            const markEntry = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
            row.push(markEntry && markEntry.score !== null ? markEntry.score : '-');
        });
        
        row.push(`${learner.avg.toFixed(1)}%`);
        row.push(symbolObj ? `${symbolObj.symbol} (L${symbolObj.level})` : '-');
        
        if (attendanceMap) {
            const stats = learner.id ? attendanceMap[learner.id] : null;
            row.push(stats ? `${stats.rate}%` : '-');
        }
        return row;
    });

    autoTable(doc, {
        startY: currentY + 3,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: isDraft ? [100, 116, 139] : [41, 37, 36],
            textColor: 255,
            fontSize: 8,
            halign: 'center'
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 45 } },
        margin: { bottom: 20, left: margin, right: margin },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const valStr = data.cell.text && data.cell.text[0];
                if (valStr && valStr.includes('%')) {
                    const val = parseFloat(valStr);
                    if (val > 0 && val < atRiskThreshold) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        }
    });

    // --- SIGNATURES & FOOTER ---
    currentY = (doc as any).lastAutoTable.finalY;
    addSignatures(doc, currentY);
    addFooter(doc);

    // FINAL OUTPUT
    const filename = `${classInfo.className.replace(/\s+/g, '_')}_${isDraft ? 'DRAFT' : 'OFFICIAL'}_Marksheet.pdf`;
    doc.save(filename);

  } catch (error) {
    console.error("PDF Generation Critical Failure:", error);
    throw error; // Re-throw to allow global toast or error boundary to catch it
  }
};