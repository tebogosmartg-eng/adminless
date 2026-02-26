import { ClassInfo, Learner, ClassInsight, LearnerComment, ScanMode, DiagnosticRow, FullDiagnostic } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

const invokeGemini = async (action: string, payload: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action, payload })
  });

  const responseText = await response.text();
  let jsonResponse: any = null;
  try { jsonResponse = JSON.parse(responseText); } catch (e) {}

  if (!response.ok) throw new Error(jsonResponse?.error || "AI Service Error");
  if (!jsonResponse.success) throw new Error(jsonResponse.error || "AI failed to process request.");

  return jsonResponse.data;
};

export const processImagesWithGemini = async (images: string[], assessmentSchema: any): Promise<any> => {
  return invokeGemini('scan-images', { images, assessmentSchema });
};

// ... other exports (generateClassInsights, etc) kept as they are
export const generateClassInsights = async (classInfo: ClassInfo, learners: Learner[], assessmentData: any): Promise<ClassInsight> => {
  return invokeGemini('generate-insights', { subject: classInfo.subject, grade: classInfo.grade, learners, assessmentData });
};

export const generateAIDiagnostic = async (assessment: any, stats: any, subject: string, grade: string): Promise<FullDiagnostic> => {
  return invokeGemini('generate-diagnostic', { assessment, stats, subject, grade });
};

export const generateRemediationWorksheet = async (subject: string, grade: string, assessmentTitle: string, findings: DiagnosticRow[]): Promise<string> => {
    const data = await invokeGemini('generate-worksheet', { subject, grade, assessmentTitle, findings });
    return data?.worksheet || "Could not generate worksheet.";
};

export const generateLearnerReport = async (learner: Learner, classInfo: ClassInfo, assessmentData: any): Promise<string> => {
    const data = await invokeGemini('generate-report', { learner, classInfo, assessmentData });
    return data?.report || "Could not generate report.";
};

export const generateBulkComments = async (learners: Learner[], tone: string): Promise<LearnerComment[]> => {
    const data = await invokeGemini('generate-bulk-comments', { learners, tone });
    return data?.comments || [];
};