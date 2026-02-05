import { Assessment, Learner, AssessmentMark, Term } from "@/lib/types";

/**
 * Generates a standardized CSV for SA-SAMS import.
 * Structure: LearnerID, Learner Name, FAT 1, FAT 2... FinalAverage
 */
export const generateSASAMSExport = (
  learners: Learner[],
  assessments: Assessment[],
  marks: AssessmentMark[],
  className: string,
  subject: string,
  termName: string
) => {
  // SA-SAMS Standardised Header
  // Format: LearnerID, Name, [Task Title (Total)]..., Calculated Term Average (%)
  const header = [
    "LearnerID",
    "Learner Name",
    ...assessments.map(a => `"${a.title} (/${a.max_mark})"`),
    "Term Average (%)"
  ].join(",");

  const rows = learners.map(learner => {
    // Escape learner name for CSV
    const name = `"${learner.name.replace(/"/g, '""')}"`;
    const learnerId = learner.id || "NEW";
    
    if (!learner.id) {
        return [learnerId, name, ...assessments.map(() => ""), ""].join(",");
    }
    
    const learnerMarks = assessments.map(ass => {
      const mark = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
      return mark?.score !== null && mark?.score !== undefined ? mark.score : "";
    });

    // Final term average based on the calculated weighted aggregate
    const finalAvg = learner.mark || "0"; 

    return [learnerId, name, ...learnerMarks, finalAvg].join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  // Predictable filename for SA-SAMS import mapping
  const safeSubject = subject.replace(/\s+/g, '_');
  const safeClass = className.replace(/\s+/g, '_');
  const safeTerm = termName.replace(/\s+/g, '_');
  const filename = `SASAMS_EXPORT_${safeSubject}_${safeClass}_${safeTerm}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};