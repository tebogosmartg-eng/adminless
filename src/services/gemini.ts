import { ClassInfo, Learner, ClassInsight, LearnerComment } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

// Helper to handle offline/error states gracefully
const mockInsights: ClassInsight = {
  summary: "Class performance is stable with steady improvement in core concepts.",
  strengths: ["Consistent attendance", "Strong engagement in group tasks"],
  areasForImprovement: ["Complex problem solving", "Time management during tests"],
  recommendations: ["Incorporate more timed practice sessions", "Use peer-review for complex problems"]
};

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
    return data || mockInsights;
  } catch (error) {
    console.error("AI Insight Generation Failed:", error);
    return mockInsights;
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
    return `Report for ${learner.name}\n\nGenerated (Offline Mode):\nLearner is performing adequately based on available data.`;
  }
};

export const generateLearnerComment = async (
    learner: Learner,
    tone: string
): Promise<string> => {
    try {
        const data = await invokeGemini('generate-single-comment', {
            learner,
            tone
        });
        return data?.comment || "";
    } catch (e) {
        console.error("Comment Gen Error", e);
        return "";
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

export const processImagesWithGemini = async (images: string[]): Promise<any> => {
  try {
    const data = await invokeGemini('scan-images', { images });
    return data;
  } catch (error) {
    console.error("Image Processing Failed:", error);
    throw error;
  }
};