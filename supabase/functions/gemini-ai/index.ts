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
 * Extracts content between the first { or [ and the last } or ]
 */
const safeExtractJson = (text: string) => {
    try {
        // Remove markdown blocks if AI included them despite instructions
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        
        const firstCurly = clean.indexOf('{');
        const firstSquare = clean.indexOf('[');
        const lastCurly = clean.lastIndexOf('}');
        const lastSquare = clean.lastIndexOf(']');

        let start = -1;
        let end = -1;

        // Determine if response is an object or an array
        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
            start = firstCurly;
            end = lastCurly;
        } else if (firstSquare !== -1) {
            start = firstSquare;
            end = lastSquare;
        }

        if (start === -1 || end === -1 || end <= start) {
            return null;
        }

        const jsonString = clean.substring(start, end + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("[gemini-ai] JSON Extraction/Parse Failed:", e.message);
        return null;
    }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Unauthorized")

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized: Invalid session")

    const { action, payload } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // REQUIREMENT 1: Force Strict JSON via System Instruction
    const model = genAI.getGenerativeModel({ 
        model: Deno.env.get('GEMINI_MODEL_NAME') || "gemini-1.5-flash",
        systemInstruction: "You are a strict JSON API. Return ONLY valid JSON. Do NOT include explanations. Do NOT include markdown. Do NOT include text before or after JSON. Output must start with { and end with }."
    }, { apiVersion: "v1beta" });

    // 1. SCAN IMAGES ACTION
    if (action === 'scan-images') {
        const { images, scanMode, questions = [] } = payload;
        const imageParts = images.map(img => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        
        // REQUIREMENT 1: Updated extraction prompt
        const prompt = `
            You are a data extraction engine.
            
            Extract the following fields from the uploaded marksheet:
            - learner_name
            - learner_surname
            - learner_id
            - subject
            - marks_obtained
            - total_marks

            Return ONLY valid JSON.
            No explanation.
            No commentary.
            No markdown.
            No 'Based on'.
            Output must start with { and end with }.

            Context: ${scanMode} mode. 
            Format the response exactly like this so the application can process it:
            {
              "details": { "subject": "", "grade": "", "testNumber": "", "date": "", "total_marks": 0 },
              "learners": [
                { "name": "", "mark": "", "questionMarks": [] }
              ]
            }
        `;

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = (await result.response).text();
        
        // REQUIREMENT 2 & 3: Safe Parsing
        const parsedData = safeExtractJson(responseText);

        if (!parsedData) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Invalid AI response format",
                rawPreview: responseText.substring(0, 200)
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // REQUIREMENT 4: Validate Data Integrity
        if (Array.isArray(parsedData.learners)) {
            const globalTotal = parseFloat(parsedData.details?.total_marks || "100");
            
            for (const l of parsedData.learners) {
                // Total validity check
                if (!l.name) continue;

                const markVal = parseFloat(l.mark || "0");
                if (!isNaN(markVal) && !isNaN(globalTotal) && markVal > globalTotal) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: "Marks exceed total allowed value" 
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }
        }

        // REQUIREMENT 6: Consistent structural return
        return new Response(JSON.stringify({ 
            success: true, 
            data: parsedData 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. GENERATE INSIGHTS ACTION
    if (action === 'generate-insights') {
        const result = await model.generateContent(`Analyze class performance for ${payload.grade} ${payload.subject}...`);
        const parsed = safeExtractJson((await result.response).text());
        return new Response(JSON.stringify({ success: !!parsed, data: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. GENERATE DIAGNOSTIC ACTION
    if (action === 'generate-diagnostic') {
        const result = await model.generateContent(`Perform a deep pedagogical diagnostic for ${payload.grade} ${payload.subject}...`);
        const parsed = safeExtractJson((await result.response).text());
        return new Response(JSON.stringify({ success: !!parsed, data: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. GENERATE WORKSHEET ACTION
    if (action === 'generate-worksheet') {
        const result = await model.generateContent(`Create a Learning Bridge Remediation Worksheet...`);
        const responseText = (await result.response).text();
        return new Response(JSON.stringify({ success: true, data: { worksheet: responseText } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // REQUIREMENT 5: Fallback for unknown actions
    return new Response(JSON.stringify({ 
        success: false, 
        error: "Action not implemented or AI extraction failed" 
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[gemini-ai] Error:", error.message);
    // REQUIREMENT 6: Always return JSON even on failure
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred in the AI engine" 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});