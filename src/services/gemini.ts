import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Function to get API Key from localStorage
const getApiKey = () => {
  const key = localStorage.getItem('gemini_api_key');
  if (key && key.trim().length > 0) {
    return key;
  }
  return null;
};

// Helper to get initialized model
const getModel = (modelName: string = "gemini-1.5-flash", schema?: any) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
};

// Robust JSON cleaner to handle Markdown blocks and extra text
const cleanJson = (text: string) => {
  if (!text) return "{}";
  
  // 1. Remove Markdown code blocks first
  let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  
  // 2. Find the outer-most JSON object or array
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  const firstSquare = clean.indexOf('[');
  const lastSquare = clean.lastIndexOf(']');

  // Determine if it's likely an object or an array
  const isObject = firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare);
  
  if (isObject && firstCurly !== -1 && lastCurly !== -1) {
    return clean.substring(firstCurly, lastCurly + 1);
  } else if (!isObject && firstSquare !== -1 && lastSquare !== -1) {
    return clean.substring(firstSquare, lastSquare + 1);
  }
  
  return clean.trim();
};

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

const scanResultSchema = {
  description: "Assessment scan result containing details and learner marks",
  type: SchemaType.OBJECT,
  properties: {
    details: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING, description: "The subject of the assessment", nullable: false },
        grade: { type: SchemaType.STRING, description: "The grade level (e.g. Grade 10)", nullable: false },
        testNumber: { type: SchemaType.STRING, description: "Name or number of the test", nullable: false },
        date: { type: SchemaType.STRING, description: "Date of assessment (YYYY-MM-DD)", nullable: false },
      },
      required: ["subject", "grade", "testNumber", "date"],
    },
    learners: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Full name of the learner", nullable: false },
          mark: { type: SchemaType.STRING, description: "The mark obtained (e.g. '15/20' or '75%')", nullable: false },
        },
        required: ["name", "mark"],
      },
    },
  },
  required: ["details", "learners"],
};

const insightsSchema = {
  description: "AI analysis and insights for class performance",
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: "A brief executive summary of the class performance.", nullable: false },
    strengths: { 
      type: SchemaType.ARRAY, 
      description: "List of key strengths identified in the results.",
      items: { type: SchemaType.STRING } 
    },
    weaknesses: { 
      type: SchemaType.ARRAY, 
      description: "List of areas where learners struggled.",
      items: { type: SchemaType.STRING } 
    },
    recommendations: { 
      type: SchemaType.ARRAY, 
      description: "Actionable recommendations for the teacher.",
      items: { type: SchemaType.STRING } 
    },
  },
  required: ["summary", "strengths", "weaknesses", "recommendations"],
};

const commentsSchema = {
  description: "List of generated report comments for learners",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING, description: "Name of the learner", nullable: false },
      comment: { type: SchemaType.STRING, description: "Generated report comment", nullable: false },
    },
    required: ["name", "comment"],
  },
};

// Generic generator with fallback
async function generateWithFallback<T>(
  prompt: string | (string | { inlineData: { mimeType: string; data: string } })[], 
  schema: any, 
  errorContext: string
): Promise<T> {
  // Try Flash first
  try {
    const model = getModel("gemini-1.5-flash", schema);
    const result = await model.generateContent(Array.isArray(prompt) ? prompt : [prompt]);
    const response = await result.response;
    const text = cleanJson(response.text());
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.warn(`Flash model failed for ${errorContext}, trying Pro...`, error);
    
    if (error.message.includes("API Key is missing")) throw error;

    // Try Pro as fallback
    try {
      const model = getModel("gemini-1.5-pro", schema);
      const result = await model.generateContent(Array.isArray(prompt) ? prompt : [prompt]);
      const response = await result.response;
      const text = cleanJson(response.text());
      return JSON.parse(text) as T;
    } catch (fallbackError: any) {
      console.error(`Pro model also failed for ${errorContext}:`, fallbackError);
      throw new Error(`AI Request Failed (${errorContext}): ${fallbackError.message || "Unknown error"}. Check your API Key.`);
    }
  }
}

export async function processImagesWithGemini(imageDataUrls: string[]): Promise<GeminiScanResult> {
  // Extract base64 data and mime type
  const imageParts = imageDataUrls.map((url) => {
    const matches = url.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      throw new Error("Invalid image format. Please upload valid image files.");
    }
    
    return {
      inlineData: {
        mimeType: matches[1],
        data: matches[2],
      },
    };
  });

  const prompt = `
    Analyze these images of student test scripts or mark sheets.
    Extract the assessment details (subject, grade, test name, date) and the list of student names and their marks.
    
    For marks:
    - If it is a fraction (e.g., "15/20"), keep it as is.
    - If it is a percentage, keep it as is.
    - If you cannot read a name or mark clearly, do your best to guess or skip it if impossible.
  `;

  return generateWithFallback<GeminiScanResult>([prompt, ...imageParts], scanResultSchema, "Scanning Images");
}

export async function generateClassInsights(subject: string, grade: string, learners: {name: string, mark: string}[]): Promise<ClassInsight> {
  const validLearners = learners.filter(l => l.mark && l.mark.trim() !== "");
  const learnersData = JSON.stringify(validLearners);

  const prompt = `
    Analyze the performance of the following class:
    Subject: ${subject}
    Grade: ${grade}
    
    Learner Data: ${learnersData}

    Please provide:
    1. A summary of how the class performed overall.
    2. Key strengths noticed in the marks (e.g., high pass rate, consistency).
    3. Weaknesses or areas of concern (e.g., significant failures, wide gap between top and bottom).
    4. Actionable recommendations for the teacher to improve results or help struggling students.
  `;

  return generateWithFallback<ClassInsight>(prompt, insightsSchema, "Class Insights");
}

export async function generateReportComments(subject: string, grade: string, learners: {name: string, mark: string}[]): Promise<LearnerComment[]> {
  const validLearners = learners.filter(l => l.mark && l.mark.trim() !== "");
  const learnersData = JSON.stringify(validLearners);

  const prompt = `
    Generate a short, encouraging, and specific report card comment (1-2 sentences) for each of the following students based on their mark.
    
    Context:
    Subject: ${subject}
    Grade: ${grade}
    
    Learner Data: ${learnersData}
    
    Guidelines:
    - High marks: Praise their effort and mastery.
    - Average marks: Encourage consistency and point out potential.
    - Low marks: Be supportive, suggest focusing on basics, but remain positive.
    - Use the learner's name in the comment.
  `;

  return generateWithFallback<LearnerComment[]>(prompt, commentsSchema, "Report Comments");
}