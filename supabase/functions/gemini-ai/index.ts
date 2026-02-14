// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, payload } = await req.json()
    
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not set.')

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = Deno.env.get('GEMINI_MODEL_NAME') || "gemini-1.5-flash"
    
    const model = genAI.getGenerativeModel(
      { model: modelName },
      { apiVersion: "v1beta" }
    );

    const cleanJson = (text: string) => {
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
        const firstCurly = clean.indexOf('{');
        const firstSquare = clean.indexOf('[');
        let startIndex = -1;
        let endIndex = -1;

        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
            startIndex = firstCurly;
            endIndex = clean.lastIndexOf('}');
        } else if (firstSquare !== -1) {
            startIndex = firstSquare;
            endIndex = clean.lastIndexOf(']');
        }

        if (startIndex !== -1 && endIndex !== -1) {
            return clean.substring(startIndex, endIndex + 1);
        }
        return clean.trim();
    };

    if (action === 'scan-images') {
        const { images, scanMode } = payload;
        
        let contextPrompt = "";
        if (scanMode === 'bulk') {
            contextPrompt = "This is a BULK CLASS MARKSHEET. Multiple students are listed on one or more pages. Extract all names and their corresponding marks.";
        } else {
            contextPrompt = "This is an INDIVIDUAL LEARNER SCRIPT. One student per set of images. Extract the student name (usually at the top) and all marks for questions/sections.";
        }

        const prompt = `
            Analyze these images of school assessments. ${contextPrompt}
            
            Extract the assessment details (subject, grade, test name, date) and the learner information.
            
            Always look for marks for individual questions (e.g., Q1, Q2, Q3 or 1, 2, 3) and extract them.
            
            Output JSON only:
            {
                "details": { 
                    "subject": "string", 
                    "grade": "string", 
                    "testNumber": "string", 
                    "date": "YYYY-MM-DD" 
                },
                "learners": [ 
                    { 
                        "name": "Learner Name", 
                        "mark": "Total Mark (numeric string)",
                        "questionMarks": [
                            { "num": "1", "score": "15" },
                            { "num": "2", "score": "20" }
                        ]
                    } 
                ]
            }
            
            Validation Rules:
            - If "25/30", record "25" as mark.
            - If no mark is found for a row, use "".
            - If multiple learners found (in bulk mode), list them all.
            - In individual mode, typically there is only one learner, but verify names across multiple images.
        `;

        const imageParts = images.map((img: any) => ({
            inlineData: {
                data: img.split(',')[1] || img,
                mimeType: "image/jpeg"
            }
        }));

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        try {
            const data = JSON.parse(jsonStr);
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
            console.error("[gemini-ai] JSON Parse Error:", e, jsonStr);
            throw new Error("Failed to parse AI response.");
        }
    }

    if (action === 'generate-insights') {
        const { subject, grade, learners, assessmentData } = payload;
        const prompt = `Analyze class performance for ${grade} ${subject}. Data: ${JSON.stringify(learners.map(l => ({ name: l.name, mark: l.mark })))}`;
        const result = await model.generateContent(prompt);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-report') {
        const { learner, classInfo, assessmentData } = payload;
        const prompt = `Write a formal school report card comment for ${learner.name} in ${classInfo.grade} ${classInfo.subject}. Mark: ${learner.mark}%`;
        const result = await model.generateContent(prompt);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-single-comment') {
        const { learner, tone } = payload;
        const prompt = `Write a short report comment for ${learner.name}. Mark: ${learner.mark}%. Tone: ${tone}`;
        const result = await model.generateContent(prompt);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-bulk-comments') {
        const { learners, tone } = payload;
        const prompt = `Generate short report comments for: ${JSON.stringify(learners)}. Tone: ${tone}`;
        const result = await model.generateContent(prompt);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})