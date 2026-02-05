import { Assessment, Learner, AssessmentMark } from "@/lib/types";
import { format } from "date-fns";

/**
 * Generates a standardised CSV for SA-SAMS import or reference.
 * Designed to be a 'source of truth' document for audit purposes.
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
  // 1. Audit Metadata Block (Top-level context)
  const metadata = [
    ["DOCUMENT TYPE", "SA-SAMS DATA PREPARATION SHEET"],
    ["PLATFORM SOURCE", "AdminLess v3.1"],
    ["ACADEMIC YEAR", yearName],
    ["ACADEMIC TERM", termName],
    ["OFFICIAL SUBJECT", subject],
    ["CLASS GROUP", className],
    ["GENERATION DATE", format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
    ["AUDIT STATUS", isFinalised ? "VERIFIED & FINALISED" : "DRAFT - NOT FOR CAPTURING"],
    [], // Spacer
  ].map(row => row.join(",")).join("\n");

  // 2. Column Headers (Import-friendly)
  // We include Task Titles with their total marks for easy cross-referencing
  const dataHeader = [
    "LearnerID",
    "Surname and Initials",
    ...assessments.map(a => `"${a.title} (Max: ${a.max_mark})"`),
    "Calculated Term %"
  ].join(",");

  // 3. Row Construction
  const rows = learners.map(learner => {
    const name = `"${learner.name.replace(/"/g, '""')}"`;
    const learnerId = learner.id || "NEW_ENTRY";
    
    // Extract raw marks for each assessment
    const rawScores = assessments.map(ass => {
      const markRecord = marks.find(m => m.assessment_id === ass.id && m.learner_id === learner.id);
      return markRecord?.score !== null && markRecord?.score !== undefined ? markRecord.score : "";
    });

    // The calculated aggregate for the term
    const finalMark = learner.mark || "0"; 

    return [learnerId, name, ...rawScores, finalMark].join(",");
  });

  // 4. Verification Footer (For paper-trail audits)
  const footer = [
    [],
    ["--- OFFICIAL AUDIT SIGN-OFF ---"],
    ["Educator Name:", "", "Signature:", "____________________", "Date:", "__________"],
    ["HOD Name:", "", "Signature:", "____________________", "Date:", "__________"],
    ["Principal Name:", "", "Signature:", "____________________", "Date:", "__________"],
    [],
    ["End of Report"]
  ].map(row => row.join(",")).join("\n");

  const csvContent = metadata + "\n" + dataHeader + "\n" + rows.join("\n") + "\n" + footer;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  // Clean filename for system compatibility
  const safeSubject = subject.replace(/[^a-z0-9]/gi, '_');
  const safeClass = className.replace(/[^a-z0-9]/gi, '_');
  const filename = `AdminLess_to_SASAMS_${safeSubject}_${safeClass}_${termName.replace(/\s/g, '')}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};