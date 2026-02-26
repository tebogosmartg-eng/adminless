import { ClassInfo, Learner, ClassInsight, LearnerComment, ScanMode, DiagnosticRow, FullDiagnostic } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enhanced helper for calling the AI edge function with detailed logging.
 * Uses native fetch to expose status codes and headers for debugging.
 */
const invokeGemini = async (action: string, payload: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
  
  console.log(`[Gemini:${action}] Calling Edge Function:`, url);

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
  
  try {
    jsonResponse = JSON.parse(responseText);
  } catch (e) {
    console.error(`[Gemini:${action}] Failed to parse response as JSON:`, responseText);
  }

  // Store for global debug panel
  (window as any).__LAST_AI_DEBUG__ = {
    action,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json: jsonResponse,
    raw: responseText.substring(0, 500)
  };

  console.group(`[Gemini Audit: ${action}]`);
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
  console.log("JSON Body:", jsonResponse);
  console.groupEnd();

  if (!response.ok) {
    const errorMsg = jsonResponse?.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }
  
  if (jsonResponse && typeof jsonResponse.success !== 'undefined') {
      if (!jsonResponse.success) {
          throw new Error(jsonResponse.error || "AI engine failed to process request.");
      }
      return jsonResponse.data;
  }

  return jsonResponse;
};

export const generateClassInsights = async (
  classInfo: ClassInfo, 
  learners: Learner[],
  assessmentData: any
): Promise<ClassInsight> => {
  return invokeGemini('generate-insights', { 
    subject: classInfo.subject,
    grade: classInfo.grade,
    learners, 
    assessmentData 
  });
};

export const generateAIDiagnostic = async (
  assessment: any,
  stats: any,
  subject: string,
  grade: string
): Promise<FullDiagnostic> => {
  return invokeGemini('generate-diagnostic', { assessment, stats, subject, grade });
};

export const generateRemediationWorksheet = async (
    subject: string,
    grade: string,
    assessmentTitle: string,
    findings: DiagnosticRow[]
): Promise<string> => {
    const data = await invokeGemini('generate-worksheet', { subject, grade, assessmentTitle, findings });
    return data?.worksheet || "Could not generate worksheet.";
};

export const generateLearnerReport = async (
  learner: Learner,
  classInfo: ClassInfo,
  assessmentData: any
): Promise<string> => {
    const data = await invokeGemini('generate-report', { 
      learner, 
      classInfo: {
        subject: classInfo.subject,
        grade: classInfo.grade,
        className: classInfo.className
      }, 
      assessmentData 
    });
    return data?.report || "Could not generate report.";
};

export const generateBulkComments = async (
    learners: Learner[],
    tone: string
): Promise<LearnerComment[]> => {
    const data = await invokeGemini('generate-bulk-comments', {
        learners: learners.map(l => ({ name: l.name, mark: l.mark })),
        tone
    });
    return data?.comments || [];
};

export const processImagesWithGemini = async (images: string[], scanMode: ScanMode = 'bulk', questions: any[] = []): Promise<any> => {
  return invokeGemini('scan-images', { images, scanMode, questions });
};