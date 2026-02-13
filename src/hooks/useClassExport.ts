import { ClassInfo, Learner, GradeSymbol, Assessment, AssessmentMark, Term } from '@/lib/types';
import { getGradeSymbol } from '@/utils/grading';
import { generateClassPDF, generateBlankClassListPDF, generateBulkLearnerReportsPDF, generateLearnerReportPDF, AttendanceStats } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { calculateClassStats } from '@/utils/stats';
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useClassExport = (
  classInfo: ClassInfo | undefined,
  learners: Learner[],
  gradingScheme: GradeSymbol[],
  schoolName: string,
  teacherName: string,
  schoolLogo: string | null,
  activeTerm: Term | null,
  assessments: Assessment[],
  marks: AssessmentMark[]
) => {
  const { contactEmail, contactPhone, atRiskThreshold } = useSettings();
  const { activeYear } = useAcademic();

  const fetchAttendanceMap = async (): Promise<Record<string, AttendanceStats>> => {
    if (!classInfo) return {};
    
    try {
        const records = await db.attendance.where('class_id').equals(classInfo.id).toArray();
        const map: Record<string, AttendanceStats> = {};
        
        learners.forEach(l => {
            if (l.id) map[l.id] = { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
        });

        records.forEach(r => {
            if (map[r.learner_id]) {
                const s = map[r.learner_id];
                if (r.status === 'present') s.present++;
                if (r.status === 'absent') s.absent++;
                if (r.status === 'late') s.late++;
                s.total++;
            }
        });

        Object.values(map).forEach(s => {
            s.rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
        });

        return map;
    } catch (e) {
        console.error("Failed to fetch attendance for export", e);
        return {};
    }
  };

  const handleShareSummary = () => {
    if (!classInfo) return;
    const stats = calculateClassStats(learners);
    
    const summary = `
📊 *Class Summary: ${classInfo.subject}*
🏫 ${classInfo.grade} - ${classInfo.className}

📈 Average: ${stats.average}%
✅ Pass Rate: ${stats.passRate}%
👨‍🎓 Learners: ${stats.totalLearners}

Top Mark: ${stats.highestMark}%
Lowest Mark: ${stats.lowestMark}%
    `.trim();

    navigator.clipboard.writeText(summary);
    showSuccess("Class summary copied to clipboard!");
  };

  const handleExportCsv = () => {
    if (!classInfo) {
      showError("Could not find class information to export.");
      return;
    }

    const isDraft = !activeTerm?.closed;
    const termAssessments = assessments.filter(a => a.class_id === classInfo.id && a.term_id === activeTerm?.id);
    const termMarks = marks.filter(m => termAssessments.some(a => a.id === m.assessment_id));

    const metadata = [
        `"Report Type","Marksheet Analytical Export (${isDraft ? 'DRAFT' : 'OFFICIAL RECORD'})"`,
        `"School","${schoolName}"`,
        `"Teacher","${teacherName}"`,
        `"Subject","${classInfo.subject}"`,
        `"Grade/Class","${classInfo.grade} - ${classInfo.className}"`,
        `"Term","${activeTerm?.name || 'N/A'}"`,
        `"Status","${isDraft ? 'Draft / Working Copy' : 'Finalised'}"`,
        `""` 
    ];

    const headers = [
        "Learner Name",
        ...termAssessments.map(ass => `"${ass.title} (/${ass.max_mark})"`),
        "Term Percentage",
        "Symbol",
        "Level",
        "Comment"
    ].join(",");

    const learnerAvgs: number[] = [];
    const csvRows = learners.map(learner => {
        const termAvg = learner.id ? calculateWeightedAverage(termAssessments, termMarks, learner.id) : 0;
        if (termAvg > 0) learnerAvgs.push(termAvg);
        
        const symbolObj = getGradeSymbol(termAvg, gradingScheme);
        const individualMarks = termAssessments.map(ass => {
            const markEntry = termMarks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
            return markEntry && markEntry.score !== null ? markEntry.score : "";
        });

        return [
            `"${learner.name.replace(/"/g, '""')}"`,
            ...individualMarks,
            `"${termAvg.toFixed(1)}%"`,
            `"${symbolObj?.symbol || '-'}"`,
            `"${symbolObj?.level || '-'}"`,
            `"${(learner.comment || '').replace(/"/g, '""')}"`
        ].join(",");
    });

    const classAvg = learnerAvgs.length > 0 ? (learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length).toFixed(1) : "0.0";
    const passCount = learnerAvgs.filter(a => a >= 50).length;
    const passRate = learnerAvgs.length > 0 ? Math.round((passCount / learnerAvgs.length) * 100) : 0;
    
    const analyticsBlock = [
        `""`,
        `"CLASS ANALYTICS SUMMARY"`,
        `"Total Learners","${learners.length}"`,
        `"Class Average","${classAvg}%"`,
        `"Pass Rate","${passRate}%"`,
        `"Highest Mark","${learnerAvgs.length > 0 ? Math.max(...learnerAvgs).toFixed(1) : '0'}%"`,
        `"Lowest Mark","${learnerAvgs.length > 0 ? Math.min(...learnerAvgs).toFixed(1) : '0'}%"`,
        `""`,
        `"MARK DISTRIBUTION"`,
        `"0-29%","${learnerAvgs.filter(a => a < 30).length}"`,
        `"30-39%","${learnerAvgs.filter(a => a >= 30 && a < 40).length}"`,
        `"40-49%","${learnerAvgs.filter(a => a >= 40 && a < 50).length}"`,
        `"50-59%","${learnerAvgs.filter(a => a >= 50 && a < 60).length}"`,
        `"60-69%","${learnerAvgs.filter(a => a >= 60 && a < 70).length}"`,
        `"70-79%","${learnerAvgs.filter(a => a >= 70 && a < 80).length}"`,
        `"80-100%","${learnerAvgs.filter(a => a >= 80).length}"`,
        `""`,
        `"ASSESSMENT ANALYSIS"`,
        `"Title","Type","Max Mark","Weight","Avg %","Highest %","Lowest %"`
    ];

    termAssessments.forEach(ass => {
        const assMarks = termMarks.filter(m => m.assessment_id === ass.id && m.score !== null);
        const pcts = assMarks.map(m => (m.score! / ass.max_mark) * 100);
        const avg = pcts.length > 0 ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1) : "0.0";
        analyticsBlock.push(`"${ass.title}","${ass.type}","${ass.max_mark}","${ass.weight}%","${avg}%","${pcts.length > 0 ? Math.max(...pcts).toFixed(1) : '0'}%","${pcts.length > 0 ? Math.min(...pcts).toFixed(1) : '0'}%"`);
    });

    const csvContent = [...metadata, headers, ...csvRows, ...analyticsBlock].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const prefix = isDraft ? "DRAFT_" : "OFFICIAL_";
      const filename = `${prefix}${classInfo.grade}_${classInfo.subject}_${classInfo.className}_Analytical_Record.csv`.replace(/\s+/g, '_');
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Analytical CSV exported.");
    } else {
      showError("Export feature is not supported in your browser.");
    }
  };

  const handleExportPdf = async () => {
    if (!classInfo) return;
    try {
      const attMap = await fetchAttendanceMap();
      const exportClassInfo = { ...classInfo, learners };
      const isDraft = !activeTerm?.closed;
      const termAssessments = assessments.filter(a => a.class_id === classInfo.id && a.term_id === activeTerm?.id);
      const termMarks = marks.filter(m => termAssessments.some(a => a.id === m.assessment_id));

      generateClassPDF(
          exportClassInfo, 
          gradingScheme, 
          schoolName, 
          teacherName, 
          schoolLogo, 
          contactEmail, 
          contactPhone, 
          attMap,
          isDraft,
          termAssessments,
          termMarks,
          activeYear,
          atRiskThreshold
      );
      
      showSuccess(isDraft ? "Draft PDF generated." : "Official PDF generated.");
    } catch (error) {
      console.error(error);
      showError("Failed to generate PDF. Please try again.");
    }
  };
  
  const handleExportBulkPdf = async () => {
    if (!classInfo) return;
    try {
      const attMap = await fetchAttendanceMap();
      generateBulkLearnerReportsPDF(learners, classInfo, gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone, attMap);
      showSuccess("Bulk PDF Report generated successfully!");
    } catch (error) {
      console.error(error);
      showError("Failed to generate bulk PDF.");
    }
  };

  const handleExportBlankPdf = () => {
    if (!classInfo) return;
    try {
      const exportClassInfo = { ...classInfo, learners };
      generateBlankClassListPDF(exportClassInfo, schoolName, teacherName, schoolLogo, contactEmail, contactPhone);
      showSuccess("Blank learner list generated!");
    } catch (error) {
      console.error(error);
      showError("Failed to generate PDF.");
    }
  };

  return {
    handleShareSummary,
    handleExportCsv,
    handleExportPdf,
    handleExportBulkPdf,
    handleExportBlankPdf
  };
};