import { Learner, ClassInsight, LearnerComment, GeminiScanResult } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

export const processImagesWithGemini = async (imageUrls: string[]): Promise<GeminiScanResult> => {
  try {
    // Prepare images payload
    const images = imageUrls.map(url => {
      const parts = url.split(',');
      const mimeType = parts[0].split(':')[1].split(';')[0];
      const data = parts[1];
      return { mimeType, data };
    });

    console.log("[Gemini Service] Invoking scan-images...");
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { 
        action: 'scan-images', 
        payload: { images } 
      }
    });

    if (error) {
      console.error("[Gemini Service] Edge Function Error:", error);
      throw new Error(error.message || "Failed to connect to AI service.");
    }

    if (!data) {
       throw new Error("No data returned from AI service.");
    }

    return data as GeminiScanResult;

  } catch (error) {
    console.error("[Gemini Service] Vision Error:", error);
    throw new Error("Failed to process images. Please try again or use manual entry.");
  }
};

export const generateClassInsights = async (subject: string, grade: string, learners: Learner[]): Promise<ClassInsight> => {
  try {
    console.log("[Gemini Service] Invoking generate-insights...");
    
    // Minimal payload to save bandwidth
    const simplifiedLearners = learners.map(l => ({ mark: l.mark })); // AI mostly needs marks for stats, maybe names if we want specific shoutouts but lets keep it anon for analysis

    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { 
        action: 'generate-insights', 
        payload: { subject, grade, learners: simplifiedLearners } 
      }
    });

    if (error) {
      console.error("[Gemini Service] Edge Function Error:", error);
      throw new Error(error.message);
    }

    return data as ClassInsight;

  } catch (error) {
    console.error("[Gemini Service] Insights Error:", error);
    // Fallback to mock if service fails to avoid breaking UI flow completely
    console.warn("Falling back to mock insights due to error.");
    return getMockClassInsights();
  }
};

export const generateReportComments = async (subject: string, grade: string, learners: Learner[]): Promise<LearnerComment[]> => {
  try {
    console.log("[Gemini Service] Invoking generate-comments...");
    
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { 
        action: 'generate-comments', 
        payload: { subject, grade, learners } 
      }
    });

    if (error) {
      console.error("[Gemini Service] Edge Function Error:", error);
      throw new Error(error.message);
    }

    return data as LearnerComment[];

  } catch (error) {
    console.error("[Gemini Service] Comments Error:", error);
    console.warn("Falling back to mock comments due to error.");
    return getMockReportComments(learners);
  }
};

// MOCK DATA GENERATORS (Fallback & Simulation)

export const getMockClassInsights = (): ClassInsight => ({
  summary: "The class shows a bimodal distribution with a strong top-performing group but a concerning tail of learners struggling with core concepts. Overall engagement appears high, though consistency is an issue.",
  strengths: [
    "High distinction rate (25%) indicates strong grasp of advanced topics.",
    "Top learners demonstrate excellent problem-solving skills.",
    "General improvement trend compared to typical term averages."
  ],
  areasForImprovement: [
    "A significant portion (30%) failed to meet the passing threshold.",
    "Basic terminology retention seems weak among lower performers.",
    "Gap between top and bottom performers is widening."
  ],
  recommendations: [
    "Implement peer-tutoring pairing high achievers with struggling learners.",
    "Devote 10 minutes of each lesson to vocabulary drilling.",
    "Offer remedial after-school sessions focusing on foundational concepts."
  ]
});

export const getMockReportComments = (learners: Learner[]): LearnerComment[] => {
  return learners.map(l => {
    const mark = parseFloat(l.mark);
    let comment = "";
    
    if (isNaN(mark)) comment = "Mark missing, unable to comment on performance.";
    else if (mark >= 80) comment = "Outstanding performance; consistently demonstrates deep understanding of the subject matter.";
    else if (mark >= 70) comment = "Very good effort; shows strong grasp of concepts with only minor errors.";
    else if (mark >= 60) comment = "Good progress; understanding is solid but requires more consistent application.";
    else if (mark >= 50) comment = "Satisfactory effort; meets basic requirements but should aim for higher precision.";
    else if (mark >= 40) comment = "Struggling to grasp key concepts; increased focus and remedial work recommended.";
    else comment = "Urgent intervention required; fundamental gaps in knowledge must be addressed immediately.";

    return { name: l.name, comment };
  });
};