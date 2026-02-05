import { Learner, Assessment, AssessmentMark } from "@/lib/types";
import { format } from "date-fns";

/**
 * Generates the official SA-SAMS summary export.
 * This format is restricted to one row per learner with finalized totals only.
 */
export const generateSASAMSExport = (
  learners: Learner[],
  className: string,
  subject: string,
  termName: string,
  yearName: string,
  teacherName: string,
  schoolCode: string = ""
) => {
  // 1. Define exact header structure
  const headers = [
    "Academic Year",
    "Term",
    "School Code",
    "Grade",
    "Class",
    "Subject",
    "Learner ID",
    "Learner Surname",
    "Learner Name",
    "Final Mark",
    "Percentage",
    "Result",
    "Teacher",
    "Date Finalised"
  ].join(",");

  // 2. Process rows
  const rows = learners.map(learner => {
    // Split name into Name and Surname (Assuming "First Last" or "First Middle Last")
    const nameParts = learner.name.trim().split(/\s+/);
    const surname = nameParts.length > 1 ? nameParts.pop() : "";
    const firstName = nameParts.join(" ");
    
    const markValue = parseFloat(learner.mark) || 0;
    const isPass = markValue >= 50;
    const result = isPass ? "Pass" : "Fail";
    
    // We use the current date as the "Finalised" reference for the export audit
    const dateFinalised = format(new Date(), 'yyyy-MM-dd');

    const row = [
      `"${yearName}"`,
      `"${termName}"`,
      `"${schoolCode}"`,
      `"${learner.class_id ? 'Grade ' + learner.class_id : ''}"`, // Placeholder if grade is missing in object
      `"${className}"`,
      `"${subject}"`,
      `"${learner.id || 'N/A'}"`,
      `"${surname?.replace(/"/g, '""')}"`,
      `"${firstName.replace(/"/g, '""')}"`,
      markValue,
      `"${markValue}%"`,
      `"${result}"`,
      `"${teacherName.replace(/"/g, '""')}"`,
      `"${dateFinalised}"`
    ];

    return row.join(",");
  });

  const csvContent = headers + "\n" + rows.join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const filename = `SASAMS_SUMMARY_${subject.replace(/\s+/g, '_')}_${className}_${termName.replace(/\s+/g, '')}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};