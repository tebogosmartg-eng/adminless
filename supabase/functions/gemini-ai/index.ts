// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

async function callGeminiAPI(prompt: string, imageParts: any[], apiKey: string) {
    // Explicitly target gemini-2.5-flash via the v1 endpoint (NOT v1beta)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Retain required payload structure (contents + parts)
    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: "Missing Authorization" }), { headers: corsHeaders, status: 401 });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const body = await req.json();
    const { action, payload } = body;
    
    const systemInstruction = "You are a strict academic data API. Return ONLY valid JSON. Validate all numbers: awarded marks cannot exceed possible marks.";

    if (action === 'scan-images') {
        const { images, assessmentSchema } = payload;
        
        // Image formatting remains completely unchanged
        const imageParts = images.map((img: string) => ({ 
            inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } 
        }));
        
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

        const responseText = await callGeminiAPI(prompt, imageParts, apiKey);
        const extracted = safeExtractJson(responseText);

        if (!extracted) throw new Error("AI returned invalid data format");

        return new Response(JSON.stringify({ success: true, data: extracted }), { headers: corsHeaders });
    } else if (action === 'scan-roster') {
        const { images } = payload;
        
        // Image formatting remains completely unchanged
        const imageParts = images.map((img: string) => ({ 
            inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } 
        }));
        
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

        const responseText = await callGeminiAPI(prompt, imageParts, apiKey);
        const extracted = safeExtractJson(responseText);

        if (!extracted || !extracted.learners) throw new Error("AI returned invalid data format");

        return new Response(JSON.stringify({ success: true, data: extracted }), { headers: corsHeaders });
    } else if (action === 'translate-text') {
        const { text, languageCode } = payload;
        
        const prompt = `
            You are a professional educational translator.
            Translate the following text into the language represented by the code "${languageCode}".
            Maintain the professional, academic tone of the original text.
            Do not add any conversational filler. Only return the translated text.
            
            Text to translate:
            ${text}
        `;

        const responseText = await callGeminiAPI(prompt, [], apiKey);
        
        return new Response(JSON.stringify({ success: true, data: { translatedText: responseText.trim() } }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, message: "Action processed" }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders, status: 500 });
  }
});