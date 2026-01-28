import { ClassInfo, Learner, ClassInsight, ScannedDetails, ScannedLearner } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

// Helper to handle offline/error states gracefully
const mockInsights: ClassInsight = {
  summary: "Class performance is stable with steady improvement in core concepts.",
  strengths: ["Consistent attendance", "Strong engagement in group tasks"],
  areasForImprovement: ["Complex problem solving", "Time management during tests"],
  recommendations: ["Incorporate more timed practice sessions", "Use peer-review for complex problems"]
};

export const generateClassInsights = async (
  classInfo: ClassInfo, 
  learners: Learner[],
  assessmentData: any
): Promise<ClassInsight> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-class-insights', {
      body: { 
        className: classInfo.className, 
        grade: classInfo.grade,
        subject: classInfo.subject,
        learners, 
        assessmentData 
      }
    });

    if (error) throw error;
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
    const { data, error } = await supabase.functions.invoke('generate-learner-report', {
      body: { learner, classInfo, assessmentData }
    });

    if (error) throw error;
    return data?.report || "Could not generate report.";
  } catch (error) {
    console.error("Report Gen Error:", error);
    return `Report for ${learner.name}\n\nGenerated (Offline Mode):\nStudent is performing adequately based on available data.`;
  }
};

export const generateLearnerComment = async (
    learner: Learner,
    tone: string
): Promise<string> => {
    // Mock implementation 
    return `Good progress shown this term. (${tone})`;
};

export const processImagesWithGemini = async (images: string[]): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('scan-scripts', {
      body: { images }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Image Processing Failed:", error);
    throw error;
  }
};

export const parseScanResult = async (text: string): Promise<any> => {
    return {};
}