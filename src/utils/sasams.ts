import { Assessment, Learner, AssessmentMark } from "@/lib/types";
import { format } from "date-fns";

/**
 * Generates a standardized CSV for SA-SAMS import with audit metadata.
 */
export const generateSASAMSExport = (
  learners: Learner[],
  assessments: Assessment[],
  marks: AssessmentMark[],
  className: string,
  subject: string,
  termName: string,
  yearName: string,
  isFinalised: boolean
) => {
  // 1. Audit Metadata Headers
  const metadata = [
    ["REPORT TYPE", "SA-SAMS Export (Formal Assessment)"],
    ["SOURCE", "Prepared by AdminLess"],
    ["ACADEMIC YEAR", yearName],
    ["TERM", termName],
    ["SUBJECT", subject],
    ["CLASS", className],
    ["GENERATED", format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
    ["STATUS", isFinalised ? "FINALISED / AUDIT-LOCKED" : "DRAFT / UNVERIFIED"],
    [], // Spacer row
  ].map(row => row.join(",")).join("\n");

  // 2. Data Headers
  const dataHeader = [
    "LearnerID",
    "Learner Name",
    ...assessments.map(a => `"${a.title} (/${a.max_mark})"`),
    "Term Average (%)"
  ].join(",");

  // 3. Data Rows
  const rows = learners.map(learner => {
    const name = `"${learner.name.replace(/"/g, '""')}"`;
    const learnerId = learner.id || "NEW";
    
    if (!learner.id) {
        return [learnerId, name, ...assessments.map(() => ""), ""].join(",");
    }
    
    const learnerMarks = assessments.map(ass => {
      const mark = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
      return mark?.score !== null && mark?.score !== undefined ? mark.score : "";
    });

    const finalAvg = learner.mark || "0"; 

    return [learnerId, name, ...learnerMarks, finalAvg].join(",");
  });

  const csvContent = metadata + "\n" + dataHeader + "\n" + rows.join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
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