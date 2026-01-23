import { supabase } from '@/integrations/supabase/client';

export interface GeminiScanResult {
  details: {
    subject: string;
    grade: string;
    testNumber: string;
    date: string;
  };
  learners: {
    name: string;
    mark: string;
  }[];
}

export interface ClassInsight {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface LearnerComment {
  name: string;
  comment: string;
}

// Helper to invoke edge function
async function invokeGeminiFunction<T>(action: string, payload: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gemini-ai', {
    body: { action, payload },
  });

  if (error) {
    console.error(`Error invoking gemini-ai for ${action}:`, error);
    throw new Error(error.message || 'Failed to process AI request');
  }

  return data as T;
}

export async function processImagesWithGemini(imageDataUrls: string[]): Promise<GeminiScanResult> {
  // Extract base64 data and mime type for the edge function
  const images = imageDataUrls.map((url) => {
    const matches = url.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      throw new Error("Invalid image format.");
    }
    return {
      mimeType: matches[1],
      data: matches[2],
    };
  });

  return invokeGeminiFunction<GeminiScanResult>('scan-images', { images });
}

export async function generateClassInsights(subject: string, grade: string, learners: {name: string, mark: string}[]): Promise<ClassInsight> {
  // Filter empty marks to save tokens
  const validLearners = learners.filter(l => l.mark && l.mark.trim() !== "");
  return invokeGeminiFunction<ClassInsight>('generate-insights', { subject, grade, learners: validLearners });
}

export async function generateReportComments(subject: string, grade: string, learners: {name: string, mark: string}[]): Promise<LearnerComment[]> {
  const validLearners = learners.filter(l => l.mark && l.mark.trim() !== "");
  return invokeGeminiFunction<LearnerComment[]>('generate-comments', { subject, grade, learners: validLearners });
}

// --- MOCK DATA FUNCTIONS (Keep these for demo mode) ---

export const getMockClassInsights = (): ClassInsight => {
  return {
    summary: "The class has performed reasonably well overall, with a strong pass rate of 75%. However, the top-end achievement is lower than expected, with few distinctions.",
    strengths: [
      "High pass rate indicates good grasp of fundamental concepts.",
      "Most learners completed the assessment, showing good participation.",
      "Learners in the middle range (50-60%) are very consistent."
    ],
    weaknesses: [
      "Lack of distinctions (80%+) suggests a struggle with complex problem-solving.",
      "A small group of learners is significantly behind the rest of the cohort.",
      "Marks for Question 3 (Hypothetical) seem universally low based on aggregate trends."
    ],
    recommendations: [
      "Review complex problem-solving strategies in the next lesson.",
      "Organize a remedial session for the 5 learners scoring below 40%.",
      "Provide extension activities to push the 70% earners into the distinction bracket."
    ]
  };
};

export const getMockReportComments = (learners: {name: string, mark: string}[]): LearnerComment[] => {
  return learners.map(l => {
    const mark = parseFloat(l.mark);
    let comment = "";
    
    if (isNaN(mark)) comment = "Please ensure all assessments are submitted.";
    else if (mark >= 80) comment = `Excellent work, ${l.name}! Your mastery of the content is impressive. Keep aiming high.`;
    else if (mark >= 60) comment = `Good effort, ${l.name}. You are consistent, but focusing on the harder questions will boost your mark.`;
    else if (mark >= 50) comment = `${l.name} has achieved a passing grade but should focus on revision to improve understanding.`;
    else comment = `${l.name} is struggling with the core concepts. Extra assistance and daily revision are highly recommended.`;
    
    return {
      name: l.name,
      comment
    };
  });
};