import { ClassInfo, Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '@/utils/grading';
import { generateClassPDF, generateBlankClassListPDF, generateBulkLearnerReportsPDF, generateLearnerReportPDF, AttendanceStats } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { calculateClassStats } from '@/utils/stats';
import { useSettings } from '@/context/SettingsContext';
import { db } from '@/db';

export const useClassExport = (
  classInfo: ClassInfo | undefined,
  learners: Learner[],
  gradingScheme: GradeSymbol[],
  schoolName: string,
  teacherName: string,
  schoolLogo: string | null
) => {
  const { contactEmail, contactPhone } = useSettings();

  // Helper to fetch attendance for all learners in the class
  const fetchAttendanceMap = async (): Promise<Record<string, AttendanceStats>> => {
    if (!classInfo) return {};
    
    try {
        const records = await db.attendance.where('class_id').equals(classInfo.id).toArray();
        const map: Record<string, AttendanceStats> = {};
        
        // Initialize for all learners
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

        // Calculate rates
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

    const csvHeader = "Learner Name,Mark,Symbol,Level,Comment\n";
    const csvRows = learners
      .map(learner => {
        const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
        const symbol = gradeSymbol?.symbol || '';
        const level = gradeSymbol?.level || '';
        return `"${learner.name.replace(/"/g, '""')}",${learner.mark},${symbol},${level},"${(learner.comment || '').replace(/"/g, '""')}"`;
      })
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `${classInfo.grade}_${classInfo.subject}_${classInfo.className}_Marks.csv`.replace(/\s+/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("CSV exported successfully!");
    } else {
      showError("Export feature is not supported in your browser.");
    }
  };

  const handleExportPdf = async () => {
    if (!classInfo) return;
    try {
      const attMap = await fetchAttendanceMap();
      const exportClassInfo = { ...classInfo, learners };
      generateClassPDF(exportClassInfo, gradingScheme, schoolName, teacherName, schoolLogo, contactEmail, contactPhone, attMap);
      showSuccess("PDF Report generated successfully!");
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
      showSuccess("Blank class list generated!");
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