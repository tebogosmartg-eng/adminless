import { ClassInfo, Learner, ClassInsight, LearnerComment, ScanMode, DiagnosticRow, FullDiagnostic } from "@/lib/types";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

const invokeGemini = async (action: string, payload: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${SUPABASE_URL}/functions/v1/gemini-ai`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
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

const safeExtractJson = (text: string) => {
    try {
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const firstCurly = clean.indexOf('{');
        const firstSquare = clean.indexOf('[');
        const lastCurly = clean.lastIndexOf('}');
        const lastSquare = clean.lastIndexOf(']');

        let start = -1;
        let end = -1;

        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
            start = firstCurly;
            end = lastCurly;
        } else if (firstSquare !== -1) {
            start = firstSquare;
            end = lastSquare;
        }

        if (start === -1 || end === -1 || end <= start) return null;
        const jsonString = clean.substring(start, end + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        return null;
    }
};

export const processImagesWithGemini = async (images: string[], assessmentSchema: any): Promise<any> => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY environment variable.");

  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${API_KEY}`;
  
  const systemInstruction = "You are a strict academic data API. Return ONLY valid JSON. Validate all numbers: awarded marks cannot exceed possible marks.";
  
  const prompt = `
      ${systemInstruction}
      
      Analyze the provided student script(s).
      
      TARGET ASSESSMENT SCHEMA:
      - Title: ${assessmentSchema.title}
      - Total Possible: ${assessmentSchema.total_marks}
      - Questions to identify: ${JSON.stringify(assessmentSchema.questions)}

      TASK:
      1. Identify the learner.
      2. Extract awarded marks for EACH question in the schema.
      3. If a question is not clearly visible, set awarded: null and add a warning.
      4. VALIDATION: If extracted 'awarded' > 'possible', set awarded: null and add warning: "Exceeds max mark".
      5. Calculate total_awarded as sum of non-null question marks.

      RETURN JSON IN THIS EXACT FORMAT:
      {
        "results": [
          {
            "learner": { "name": "string", "surname": "string", "id": "string|null" },
            "questions": [
              { 
                "id": "string (from schema)", 
                "label": "string", 
                "awarded": number|null, 
                "possible": number, 
                "confidence": number(0-1), 
                "evidence_text": "string" 
              }
            ],
            "totals": { "total_awarded": number, "total_possible": number },
            "warnings": ["string"]
          }
        ]
      }
  `;

  const imageParts = images.map(img => ({
    inlineData: {
      data: img.split(',')[1] || img,
      mimeType: "image/jpeg"
    }
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          ...imageParts
        ]
      }]
    })
  });

  const jsonResponse = await response.json();
  if (!response.ok) throw new Error(jsonResponse.error?.message || "AI failed to process request.");

  const text = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response text returned from Gemini API.");

  const extracted = safeExtractJson(text);
  if (!extracted) throw new Error("AI returned invalid data format.");

  return extracted;
};

export const scanRosterWithGemini = async (images: string[]): Promise<any> => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY environment variable.");

  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${API_KEY}`;
  
  const systemInstruction = "You are a strict academic data API. Return ONLY valid JSON. Validate all numbers: awarded marks cannot exceed possible marks.";
  
  const prompt = `
      ${systemInstruction}
      
      Analyze the provided image of a class register or learner list.
      Extract ONLY the names of the students. Ignore grades, marks, or other metadata.
      
      RETURN JSON IN THIS EXACT FORMAT:
      {
        "learners": [
          { "name": "string", "surname": "string" }
        ]
      }
  `;

  const imageParts = images.map(img => ({
    inlineData: {
      data: img.split(',')[1] || img,
      mimeType: "image/jpeg"
    }
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          ...imageParts
        ]
      }]
    })
  });

  const jsonResponse = await response.json();
  if (!response.ok) throw new Error(jsonResponse.error?.message || "AI failed to process request.");

  const text = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response text returned from Gemini API.");

  const extracted = safeExtractJson(text);
  if (!extracted || !extracted.learners) throw new Error("AI returned invalid data format.");

  return extracted;
};

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

export const translateTextWithGemini = async (text: string, languageCode: string): Promise<string> => {
    const data = await invokeGemini('translate-text', { text, languageCode });
    return data?.translatedText || text;
};