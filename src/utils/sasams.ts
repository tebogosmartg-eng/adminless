import { Assessment, Learner, AssessmentMark, Term } from "@/lib/types";

/**
 * Generates a standardized CSV for SA-SAMS import.
 * Structure: Name, Task1, Task2... TaskN, FinalAverage
 */
export const generateSASAMSExport = (
  learners: Learner[],
  assessments: Assessment[],
  marks: AssessmentMark[],
  className: string,
  subject: string,
  termName: string
) => {
  // SA-SAMS Predictable Header
  // Format: Name, [Task Title (Total)]..., Final %
  const header = [
    "Learner Name",
    ...assessments.map(a => `"${a.title} (/${a.max_mark})"`),
    "Term Average (%)"
  ].join(",");

  const rows = learners.map(learner => {
    // Escape learner name for CSV
    const name = `"${learner.name.replace(/"/g, '""')}"`;
    
    if (!learner.id) {
        return [name, ...assessments.map(() => ""), ""].join(",");
    }
    
    const learnerMarks = assessments.map(ass => {
      const mark = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
      return mark?.score !== null && mark?.score !== undefined ? mark.score : "";
    });

    // Use the aggregate mark stored on the learner object (which represents the term average)
    const finalAvg = learner.mark || ""; 

    return [name, ...learnerMarks, finalAvg].join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  // Format: SASAMS_Subject_ClassName_TermName.csv
  const safeSubject = subject.replace(/\s+/g, '_');
  const safeClass = className.replace(/\s+/g, '_');
  const safeTerm = termName.replace(/\s+/g, '_');
  const filename = `SASAMS_${safeSubject}_${safeClass}_${safeTerm}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};