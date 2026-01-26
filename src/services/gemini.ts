import { GoogleGenerativeAI } from "@google/generative-ai";
import { Learner, ClassInsight, LearnerComment, GeminiScanResult } from "@/lib/types";

// In a real app, use an env variable or backend proxy
// For this demo, we might be using a client-side key or a Supabase Edge Function
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const genAI = new GoogleGenerativeAI(apiKey);

export const processImagesWithGemini = async (imageUrls: string[]): Promise<GeminiScanResult> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in settings or .env");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze these images of a handwritten or printed class list with marks.
      Extract:
      1. The Subject, Grade, Test Name/Number, and Date (if visible).
      2. A list of all learners and their marks.
      
      Return ONLY valid JSON in this specific format:
      {
        "details": {
          "subject": "string",
          "grade": "string",
          "testNumber": "string",
          "date": "YYYY-MM-DD"
        },
        "learners": [
          { "name": "string", "mark": "string" }
        ]
      }
      If a specific detail is not found, use an empty string.
      For marks, keep them exactly as written (e.g. "25/30" or "85%").
    `;

    // Convert base64 data URLs to parts
    const imageParts = imageUrls.map(url => {
      const base64Data = url.split(',')[1];
      const mimeType = url.split(':')[1].split(';')[0];
      return {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };
    });

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks if present
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(cleanedText) as GeminiScanResult;
    return parsedData;

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Failed to process images. Ensure the image is clear and contains a list.");
  }
};

export const generateClassInsights = async (subject: string, grade: string, learners: Learner[]): Promise<ClassInsight> => {
  if (!apiKey) {
     // Return mock data if no API key for demo purposes
     return getMockClassInsights();
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Anonymize data slightly for prompt
    const marksList = learners.map(l => l.mark).join(', ');
    
    const prompt = `
      Act as a senior educational analyst.
      Analyze the performance of a ${grade} ${subject} class based on these marks: [${marksList}].
      
      Provide a concise JSON analysis with:
      1. summary: A 2-sentence overview of the class performance.
      2. strengths: Array of 3 key strengths observed.
      3. areasForImprovement: Array of 3 specific areas to focus on.
      4. recommendations: Array of 3 actionable teaching strategies.
      
      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText) as ClassInsight;

  } catch (error) {
    console.error("Gemini Insights Error:", error);
    throw new Error("Failed to generate insights.");
  }
};

export const generateReportComments = async (subject: string, grade: string, learners: Learner[]): Promise<LearnerComment[]> => {
  if (!apiKey) {
     return getMockReportComments(learners);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const learnersData = learners.map(l => `${l.name}: ${l.mark}`).join('\n');

    const prompt = `
      Generate unique, constructive 1-sentence report card comments for these ${grade} ${subject} learners based on their marks.
      Tone: Professional, encouraging, and specific.
      
      Learners:
      ${learnersData}
      
      Return ONLY valid JSON as an array of objects:
      [ { "name": "Student Name", "comment": "The comment." } ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText) as LearnerComment[];

  } catch (error) {
    console.error("Gemini Comments Error:", error);
    throw new Error("Failed to generate comments.");
  }
};

// MOCK DATA GENERATORS (Fallback)

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