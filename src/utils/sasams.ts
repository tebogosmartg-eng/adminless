import { Learner } from "@/lib/types";
import { format } from "date-fns";

export const generateSASAMSExport = (
  learners: Learner[],
  className: string,
  grade: string,
  subject: string,
  termName: string,
  yearName: string,
  teacherName: string,
  schoolCode: string = "",
  returnString: boolean = false
): string | void => {
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

  const rows = learners.map(learner => {
    const nameParts = learner.name.trim().split(/\s+/);
    const surname = nameParts.length > 1 ? nameParts.pop() : "";
    const firstName = nameParts.join(" ");
    
    const markValue = parseFloat(learner.mark) || 0;
    const isPass = markValue >= 50;
    const result = isPass ? "Pass" : "Fail";
    
    const dateFinalised = format(new Date(), 'yyyy-MM-dd');

    const row = [
      `"${yearName}"`,
      `"${termName}"`,
      `"${schoolCode}"`,
      `"${grade}"`,
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
  
  if (returnString) {
      return csvContent;
  }
  
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