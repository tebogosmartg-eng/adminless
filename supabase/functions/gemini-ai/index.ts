import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set')
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Helper to clean JSON
    const cleanJson = (text: string) => {
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
        const firstCurly = clean.indexOf('{');
        const lastCurly = clean.lastIndexOf('}');
        const firstSquare = clean.indexOf('[');
        const lastSquare = clean.lastIndexOf(']');
        const isObject = firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare);
        if (isObject && firstCurly !== -1 && lastCurly !== -1) {
            return clean.substring(firstCurly, lastCurly + 1);
        } else if (!isObject && firstSquare !== -1 && lastSquare !== -1) {
            return clean.substring(firstSquare, lastSquare + 1);
        }
        return clean.trim();
    };

    if (action === 'scan-images') {
        const { images } = payload; // Array of { mimeType, data }
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
            Analyze these images of student test scripts or mark sheets.
            Extract the assessment details (subject, grade, test name, date) and the list of student names and their marks.
            Output JSON only with this schema:
            {
                "details": { "subject": string, "grade": string, "testNumber": string, "date": string },
                "learners": [ { "name": string, "mark": string } ]
            }
            For marks: keep "15/20" or "75%" format.
        `;

        const imageParts = images.map((img: any) => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const json = cleanJson(response.text());
        return new Response(json, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-insights') {
        const { subject, grade, learners } = payload;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
            Analyze the performance of the following class:
            Subject: ${subject}
            Grade: ${grade}
            Learner Data: ${JSON.stringify(learners)}

            Output JSON only:
            {
                "summary": string,
                "strengths": string[],
                "weaknesses": string[],
                "recommendations": string[]
            }
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = cleanJson(response.text());
        return new Response(json, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate-comments') {
        const { subject, grade, learners } = payload;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Generate a short report card comment (1-2 sentences) for each student.
            Subject: ${subject}
            Grade: ${grade}
            Learner Data: ${JSON.stringify(learners)}

            Output JSON array only:
            [ { "name": string, "comment": string } ]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = cleanJson(response.text());
        return new Response(json, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})