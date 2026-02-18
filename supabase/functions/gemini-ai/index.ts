// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Defensive JSON Extraction Helper
 */
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
        console.error("[gemini-ai] Internal JSON Parse Error:", e.message);
        return null;
    }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        console.error("[gemini-ai] Missing Authorization Header");
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { headers: corsHeaders, status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error("[gemini-ai] Auth Error or No User:", authError);
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: Invalid session" }), { headers: corsHeaders, status: 200 });
    }

    const body = await req.json();
    const { action, payload } = body;
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const genAI = new GoogleGenerativeAI(apiKey)
    
    const model = genAI.getGenerativeModel({ 
        model: Deno.env.get('GEMINI_MODEL_NAME') || "gemini-1.5-flash",
        systemInstruction: "You are a strict JSON API. Return ONLY valid JSON. Do NOT include explanations. Do NOT include markdown. Output must start with { and end with }."
    }, { apiVersion: "v1beta" });

    // 1. SCAN IMAGES ACTION
    if (action === 'scan-images') {
        const { images, scanMode, questions = [] } = payload;
        const imageParts = images.map(img => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        
        const prompt = `
            You are a data extraction assistant for school marksheets.
            Extract information from the provided images.
            
            Required fields: learner_name, learner_surname, learner_id, subject, marks_obtained, total_marks.
            
            Return ONLY valid JSON in this exact structure:
            {
              "details": {
                "subject": "string",
                "grade": "string",
                "testNumber": "string",
                "date": "YYYY-MM-DD",
                "total_marks": number
              },
              "learners": [
                {
                  "name": "string (learner_name + learner_surname)",
                  "learner_id": "string",
                  "mark": "string (marks_obtained)",
                  "questionMarks": []
                }
              ]
            }
        `;

        let result;
        try {
            result = await model.generateContent([prompt, ...imageParts]);
        } catch (e) {
            console.error("[gemini-ai] Gemini API Error (Scan):", e.message);
            return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), { headers: corsHeaders, status: 200 });
        }

        const responseText = (await result.response).text();
        const extractedData = safeExtractJson(responseText);

        if (!extractedData) {
            console.error("[gemini-ai] JSON Parsing Failed for Scan results");
            return new Response(JSON.stringify({ success: false, error: "Invalid AI response format" }), { headers: corsHeaders, status: 200 });
        }

        console.log("FINAL RESPONSE:", extractedData);

        return new Response(JSON.stringify({ 
          success: true, 
          data: extractedData 
        }), { headers: corsHeaders, status: 200 });
    }

    // 2. GENERATE INSIGHTS ACTION
    if (action === 'generate-insights') {
        try {
            const result = await model.generateContent(`Analyze class performance for ${payload.grade} ${payload.subject}...`);
            const responseText = (await result.response).text();
            const extractedData = safeExtractJson(responseText);
            if (!extractedData) return new Response(JSON.stringify({ success: false, error: "Invalid AI response format" }), { headers: corsHeaders, status: 200 });
            
            console.log("FINAL RESPONSE:", extractedData);
            return new Response(JSON.stringify({ success: true, data: extractedData }), { headers: corsHeaders, status: 200 });
        } catch (e) {
            console.error("[gemini-ai] AI Error (Insights):", e.message);
            return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), { headers: corsHeaders, status: 200 });
        }
    }

    // 3. GENERATE DIAGNOSTIC ACTION
    if (action === 'generate-diagnostic') {
        try {
            const result = await model.generateContent(`Perform a deep pedagogical diagnostic for ${payload.grade} ${payload.subject}...`);
            const responseText = (await result.response).text();
            const extractedData = safeExtractJson(responseText);
            if (!extractedData) return new Response(JSON.stringify({ success: false, error: "Invalid AI response format" }), { headers: corsHeaders, status: 200 });
            
            console.log("FINAL RESPONSE:", extractedData);
            return new Response(JSON.stringify({ success: true, data: extractedData }), { headers: corsHeaders, status: 200 });
        } catch (e) {
            console.error("[gemini-ai] AI Error (Diagnostic):", e.message);
            return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), { headers: corsHeaders, status: 200 });
        }
    }

    // 4. GENERATE WORKSHEET ACTION
    if (action === 'generate-worksheet') {
        try {
            const result = await model.generateContent(`Create a Learning Bridge Remediation Worksheet...`);
            const responseText = (await result.response).text();
            
            const extractedData = { worksheet: responseText };
            console.log("FINAL RESPONSE:", extractedData);
            return new Response(JSON.stringify({ success: true, data: extractedData }), { headers: corsHeaders, status: 200 });
        } catch (e) {
            console.error("[gemini-ai] AI Error (Worksheet):", e.message);
            return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), { headers: corsHeaders, status: 200 });
        }
    }

    return new Response(JSON.stringify({ success: false, error: "Action not implemented" }), { headers: corsHeaders, status: 200 });

  } catch (error) {
    console.error("[gemini-ai] Global Critical Failure:", error.message);
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred in the AI engine" 
    }), { headers: corsHeaders, status: 200 });
  }
});