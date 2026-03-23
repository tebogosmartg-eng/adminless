// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

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
    const genAI = new GoogleGenerativeAI(apiKey)
    
    const systemInstruction = "You are a strict academic data API. Return ONLY valid JSON. Validate all numbers: awarded marks cannot exceed possible marks.";

    // Safely resolve the model name, falling back to 1.5-flash if the secret is missing or invalid (like gemini-3)
    let envModel = Deno.env.get('GEMINI_MODEL_NAME');
    let modelName = (envModel && !envModel.includes('gemini-3')) ? envModel : "gemini-1.5-flash";
    
    // Removing the hardcoded apiVersion: "v1" so the SDK can negotiate the right endpoint for the 1.5 models
    const model = genAI.getGenerativeModel({
        model: modelName
    });

    if (action === 'scan-images') {
        const { images, assessmentSchema } = payload;
        const imageParts = images.map(img => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        
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

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = (await result.response).text();
        const extracted = safeExtractJson(responseText);

        if (!extracted) throw new Error("AI returned invalid data format");

        return new Response(JSON.stringify({ success: true, data: extracted }), { headers: corsHeaders });
    } else if (action === 'scan-roster') {
        const { images } = payload;
        const imageParts = images.map((img: string) => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        
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

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = (await result.response).text();
        const extracted = safeExtractJson(responseText);

        if (!extracted || !extracted.learners) throw new Error("AI returned invalid data format");

        return new Response(JSON.stringify({ success: true, data: extracted }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, message: "Action processed" }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders, status: 500 });
  }
});