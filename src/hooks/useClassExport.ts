import { ClassInfo, Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '@/utils/grading';
import { generateClassPDF, generateBlankClassListPDF, generateBulkLearnerReportsPDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { calculateClassStats } from '@/utils/stats';

export const useClassExport = (
  classInfo: ClassInfo | undefined,
  learners: Learner[],
  gradingScheme: GradeSymbol[],
  schoolName: string,
  teacherName: string,
  schoolLogo: string | null
) => {
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

  const handleExportPdf = () => {
    if (!classInfo) return;
    try {
      const exportClassInfo = { ...classInfo, learners };
      generateClassPDF(exportClassInfo, gradingScheme, schoolName, teacherName, schoolLogo);
      showSuccess("PDF Report generated successfully!");
    } catch (error) {
      console.error(error);
      showError("Failed to generate PDF. Please try again.");
    }
  };
  
  const handleExportBulkPdf = () => {
    if (!classInfo) return;
    try {
      generateBulkLearnerReportsPDF(learners, classInfo, gradingScheme, schoolName, teacherName, schoolLogo);
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
      generateBlankClassListPDF(exportClassInfo, schoolName, teacherName, schoolLogo);
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