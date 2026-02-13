// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verify Authentication (Fixes High Security Finding)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("[gemini-ai] Missing Authorization header")
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

    // This verifies the JWT and ensures the user has a valid session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("[gemini-ai] Invalid session token", { authError })
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[gemini-ai] Processing request for user: ${user.id}`)

    const { action, payload } = await req.json()
    
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error("[gemini-ai] API key configuration missing")
      throw new Error('GEMINI_API_KEY not set.')
    }

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
        const { images } = payload;
        console.log(`[gemini-ai] Action: scan-images, Image count: ${images?.length}`)
        
        const prompt = `
            Analyze these images of learner test scripts, mark sheets, or class lists.
            Extract the assessment details (subject, grade, test name, date) and the list of learner names and their marks.
            
            If this is just a class list without marks, extract the names and leave the marks as empty strings.
            
            Output JSON only with this exact schema:
            {
                "details": { 
                    "subject": "string (e.g. Mathematics)", 
                    "grade": "string (e.g. Grade 10)", 
                    "testNumber": "string (e.g. Term 1 Test)", 
                    "date": "YYYY-MM-DD" 
                },
                "learners": [ 
                    { "name": "Learner Name", "mark": "85" } 
                ]
            }
            For marks: 
            - If "25/30", keep "25/30". 
            - If "85%", keep "85%".
            - If just a number "85", keep "85".
            - If no mark is found for a name, use "".
            - Ignore rows that look like headers or totals.
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
            console.error("[gemini-ai] JSON Parse Error in scan-images:", e, jsonStr);
            throw new Error("Failed to parse AI response as JSON.");
        }
    }

    if (action === 'generate-insights') {
        const { subject, grade, learners, assessmentData } = payload;
        console.log(`[gemini-ai] Action: generate-insights for ${grade} ${subject}`)
        
        const prompt = `
            Analyze the performance of the following class.
            Subject: ${subject}
            Grade: ${grade}
            
            Learner Data (Current Aggregate): 
            ${JSON.stringify(learners.map(l => ({ name: l.name, mark: l.mark })))}

            Assessment History (Context):
            ${assessmentData ? JSON.stringify(assessmentData.assessments.map(a => ({ title: a.title, type: a.type, max: a.max_mark }))) : "No detailed assessment history."}

            Provide a strategic analysis for the teacher.
            Output JSON only:
            {
                "summary": "A concise 2-3 sentence overview of class performance trends.",
                "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                "areasForImprovement": ["Weakness 1", "Weakness 2", "Weakness 3"],
                "recommendations": ["Strategy 1", "Strategy 2", "Strategy 3"]
            }
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        return new Response(jsonStr, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-report') {
        const { learner, classInfo, assessmentData } = payload;
        console.log(`[gemini-ai] Action: generate-report for learner ${learner?.name}`)
        
        const prompt = `
            Write a formal school report card comment for:
            Learner: ${learner.name}
            Class: ${classInfo.grade} ${classInfo.subject}
            Overall Mark: ${learner.mark || 'N/A'}%
            Teacher's Existing Note: ${learner.comment || 'None'}
            
            Detailed Assessment History: ${JSON.stringify(assessmentData)}
            
            The tone should be professional and constructive.
            Focus on their strengths and specific areas where they can improve based on the assessment history provided.
            
            Output JSON only:
            { "report": "The generated paragraph text..." }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        return new Response(jsonStr, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-single-comment') {
        const { learner, tone } = payload;
        console.log(`[gemini-ai] Action: generate-single-comment for learner ${learner?.name}`)
        
        const prompt = `
            Write a short, single-sentence report card comment for:
            Learner: ${learner.name}
            Mark: ${learner.mark}%
            Tone: ${tone || 'Professional'}
            
            Output JSON only:
            { "comment": "The comment text." }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        return new Response(jsonStr, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-bulk-comments') {
        const { learners, tone } = payload;
        console.log(`[gemini-ai] Action: generate-bulk-comments for ${learners?.length} learners`)
        
        const prompt = `
            Generate short, unique, single-sentence report card comments for the following learners based on their marks.
            Tone: ${tone || 'Professional'}
            
            Learners:
            ${JSON.stringify(learners)}
            
            Output JSON only with an array of objects:
            {
                "comments": [
                    { "name": "Learner Name", "comment": "The comment." },
                    ...
                ]
            }
            Ensure the order matches or names are accurate.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        return new Response(jsonStr, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("[gemini-ai] Error in function handler:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})