import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key provided by user
const API_KEY = "AIzaSyBNc6VQDlTP_Fw2Af1kb78sTnVN1QB2kG8";
const genAI = new GoogleGenerativeAI(API_KEY);

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

export async function processImagesWithGemini(imageDataUrls: string[]): Promise<GeminiScanResult> {
  // Using gemini-3-flash-preview as requested
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const imageParts = imageDataUrls.map((url) => {
    // Extract base64 data and mime type
    // Format: data:image/jpeg;base64,....
    const matches = url.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      throw new Error("Invalid image format");
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
    Extract the following assessment details:
    1. Subject Name
    2. Grade Level
    3. Test Name or Number
    4. Date (YYYY-MM-DD format if possible)
    
    Also extract the list of student names and their marks.
    - If the mark is a fraction (e.g., "15/20"), keep it as is.
    - If it is a percentage, keep it as is.
    - If you cannot read a name or mark clearly, do your best to guess or skip it.
    
    Return the result strictly as a JSON object with no markdown formatting. The structure must be:
    {
      "details": {
        "subject": "string",
        "grade": "string",
        "testNumber": "string",
        "date": "string"
      },
      "learners": [
        { "name": "string", "mark": "string" }
      ]
    }
  `;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Sanitize the output to ensure it's valid JSON
    // Sometimes the model wraps it in ```json ... ```
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(jsonString) as GeminiScanResult;
  } catch (error) {
    console.error("Error processing images with Gemini:", error);
    throw new Error("Failed to process images with AI.");
  }
}