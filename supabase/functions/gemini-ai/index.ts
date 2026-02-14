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
    const model = genAI.getGenerativeModel({ model: Deno.env.get('GEMINI_MODEL_NAME') || "gemini-1.5-flash" }, { apiVersion: "v1beta" });

    const cleanJson = (text: string) => {
        let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
        const firstCurly = clean.indexOf('{');
        const firstSquare = clean.indexOf('[');
        let start = -1; let end = -1;
        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) { start = firstCurly; end = clean.lastIndexOf('}'); }
        else if (firstSquare !== -1) { start = firstSquare; end = clean.lastIndexOf(']'); }
        return start !== -1 ? clean.substring(start, end + 1) : clean.trim();
    };

    if (action === 'scan-images') {
        const { images, scanMode } = payload; // scanMode is actually scanType here
        
        let contextRules = "";
        if (scanMode === 'class_marksheet') {
            contextRules = "This is a BULK MARKSHEET. Extract multiple learner names and their total marks.";
        } else if (scanMode === 'individual_script') {
            contextRules = "This is an INDIVIDUAL LEARNER SCRIPT. Extract the student name and total mark from the cover/first page.";
        } else if (scanMode === 'learner_roster') {
            contextRules = "This is a CLASS ROSTER. Extract all learner names. Marks are not required.";
        } else if (scanMode === 'attendance_register') {
            contextRules = "This is an ATTENDANCE REGISTER. Extract learner names and map their status to 'present', 'absent', 'late', or 'excused'.";
        } else if (scanMode === 'diagnostic_form' || scanMode === 'moderation_sample') {
            contextRules = "This is formal MODERATION EVIDENCE. Extract student name, subject, and any findings or narrative summary text.";
        }

        const prompt = `
            Analyze these images of South African school documents. ${contextRules}
            
            Strictly output JSON only in this format:
            {
                "details": { "subject": "string", "grade": "string", "testNumber": "string", "date": "YYYY-MM-DD", "findings": "string (opt)", "interventions": "string (opt)" },
                "learners": [ 
                    { 
                        "name": "Full Name", 
                        "mark": "Numeric total mark (string)", 
                        "attendanceStatus": "present|absent|late|excused (opt)",
                        "questionMarks": [ { "num": "1", "score": "15" } ] 
                    } 
                ]
            }

            Normalization Rules:
            - If "25/30", record "25" in mark.
            - Trim whitespace from names.
            - If no date found, use "".
        `;

        const imageParts = images.map(img => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        const result = await model.generateContent([prompt, ...imageParts]);
        return new Response(JSON.stringify(JSON.parse(cleanJson((await result.response).text()))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pass through other actions...
    if (action === 'generate-insights') {
        const { subject, grade, learners } = payload;
        const result = await model.generateContent(`Analyze class performance for ${grade} ${subject}. Data: ${JSON.stringify(learners)}`);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Action ${action} not implemented.`);

  } catch (error) {
    console.error("[gemini-ai] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});