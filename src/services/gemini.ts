import { ClassInfo, Learner, ClassInsight, LearnerComment, ScanMode, DiagnosticRow, FullDiagnostic } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

// Unified helper for calling the monolith edge function
const invokeGemini = async (action: string, payload: any) => {
  const { data, error } = await supabase.functions.invoke('gemini-ai', {
    body: { action, payload }
  });

  if (error) throw error;
  return data;
};

export const generateClassInsights = async (
  classInfo: ClassInfo, 
  learners: Learner[],
  assessmentData: any
): Promise<ClassInsight> => {
  try {
    const data = await invokeGemini('generate-insights', { 
      subject: classInfo.subject,
      grade: classInfo.grade,
      learners, 
      assessmentData 
    });
    return data;
  } catch (error) {
    console.error("AI Insight Generation Failed:", error);
    return {
        summary: "Could not generate insights.",
        strengths: [],
        areasForImprovement: [],
        recommendations: []
    };
  }
};

export const generateAIDiagnostic = async (
  assessment: any,
  stats: any,
  subject: string,
  grade: string
): Promise<FullDiagnostic> => {
  try {
    const data = await invokeGemini('generate-diagnostic', { assessment, stats, subject, grade });
    return data;
  } catch (error) {
    console.error("Diagnostic AI Generation Failed:", error);
    throw error;
  }
};

export const generateRemediationWorksheet = async (
    subject: string,
    grade: string,
    assessmentTitle: string,
    findings: DiagnosticRow[]
): Promise<string> => {
    try {
        const data = await invokeGemini('generate-worksheet', { subject, grade, assessmentTitle, findings });
        return data?.worksheet || "Could not generate worksheet.";
    } catch (e) {
        console.error("Worksheet Generation Failed:", e);
        throw e;
    }
};

export const generateLearnerReport = async (
  learner: Learner,
  classInfo: ClassInfo,
  assessmentData: any
): Promise<string> => {
  try {
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
  } catch (error) {
    console.error("Report Gen Error:", error);
    return `Report generation unavailable.`;
  }
};

export const generateBulkComments = async (
    learners: Learner[],
    tone: string
): Promise<LearnerComment[]> => {
    try {
        const data = await invokeGemini('generate-bulk-comments', {
            learners: learners.map(l => ({ name: l.name, mark: l.mark })),
            tone
        });
        return data?.comments || [];
    } catch (e) {
        console.error("Bulk Comment Gen Error", e);
        return [];
    }
};

export const processImagesWithGemini = async (images: string[], scanMode: ScanMode = 'bulk', questions: any[] = []): Promise<any> => {
  try {
    const data = await invokeGemini('scan-images', { images, scanMode, questions });
    return data;
  } catch (error) {
    console.error("Image Processing Failed:", error);
    throw error;
  }
};