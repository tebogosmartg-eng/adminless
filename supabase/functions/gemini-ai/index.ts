// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set in Edge Function environment variables.')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use flash model for speed and cost effectiveness
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Helper to extract JSON from Markdown code blocks
    const cleanJson = (text: string) => {
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
        // Find the first '{' or '['
        const firstCurly = clean.indexOf('{');
        const firstSquare = clean.indexOf('[');
        
        let startIndex = -1;
        let endIndex = -1;

        // Determine if we are looking for an object or array
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
        const { images } = payload; // Array of { mimeType, data }
        
        const prompt = `
            Analyze these images of student test scripts, mark sheets, or class lists.
            Extract the assessment details (subject, grade, test name, date) and the list of student names and their marks.
            
            Output JSON only with this exact schema:
            {
                "details": { 
                    "subject": "string (e.g. Mathematics)", 
                    "grade": "string (e.g. Grade 10)", 
                    "testNumber": "string (e.g. Term 1 Test)", 
                    "date": "YYYY-MM-DD" 
                },
                "learners": [ 
                    { "name": "Student Name", "mark": "85" } 
                ]
            }
            For marks: 
            - If "25/30", keep "25/30". 
            - If "85%", keep "85%".
            - If just a number "85", keep "85".
            - Ignore rows that look like headers or totals.
        `;

        const imageParts = images.map((img: any) => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        try {
            const data = JSON.parse(jsonStr);
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
            console.error("JSON Parse Error:", e, jsonStr);
            throw new Error("Failed to parse AI response as JSON.");
        }
    }

    if (action === 'generate-insights') {
        const { subject, grade, learners } = payload;
        
        const prompt = `
            Analyze the performance of the following class:
            Subject: ${subject}
            Grade: ${grade}
            Learner Data (Marks): ${JSON.stringify(learners)}

            Output JSON only:
            {
                "summary": "A concise 2-3 sentence overview of class performance.",
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

    if (action === 'generate-comments') {
        const { subject, grade, learners } = payload;

        const prompt = `
            Generate a unique, professional report card comment (1 sentence) for each student based on their mark.
            Subject: ${subject}
            Grade: ${grade}
            Learner Data: ${JSON.stringify(learners)}

            Output JSON array only:
            [ { "name": "Student Name", "comment": "The comment." } ]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonStr = cleanJson(response.text());
        
        return new Response(jsonStr, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("[Gemini AI Function Error]:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})