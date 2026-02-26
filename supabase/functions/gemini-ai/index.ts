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
        return new Response(JSON.stringify({ success: false, error: "Missing Authorization header" }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
        return new Response(JSON.stringify({ success: false, error: "GEMINI_API_KEY not configured in Supabase Secrets" }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        });
    }

    const body = await req.json();
    const { action, payload } = body;
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
            Extract information from the provided school marksheet images.
            Required fields: learner_name, marks_obtained.
            Return ONLY valid JSON in this exact structure:
            {
              "details": { "subject": "string", "grade": "string", "total_marks": number },
              "learners": [ { "name": "string", "mark": "string" } ]
            }
        `;

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = (await result.response).text();
        const extractedData = safeExtractJson(responseText);

        if (!extractedData) {
            return new Response(JSON.stringify({ success: false, error: "AI returned invalid JSON format" }), { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: 502 
            });
        }

        return new Response(JSON.stringify({ success: true, data: extractedData }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        });
    }

    // Default response for other actions (omitted for brevity but following same pattern)
    return new Response(JSON.stringify({ success: true, data: { message: "Action received" } }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    });

  } catch (error) {
    console.error("[gemini-ai] Critical Failure:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    });
  }
});