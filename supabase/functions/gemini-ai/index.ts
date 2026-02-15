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
        const { images, scanMode, questions = [] } = payload;
        const imageParts = images.map(img => ({ inlineData: { data: img.split(',')[1] || img, mimeType: "image/jpeg" } }));
        const result = await model.generateContent(["Analyze school documents...", ...imageParts]);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'generate-insights') {
        const { subject, grade, learners } = payload;
        const result = await model.generateContent(`Analyze class performance for ${grade} ${subject}...`);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'generate-diagnostic') {
        const { assessment, stats, subject, grade } = payload;
        const prompt = `Perform a deep root-cause diagnostic analysis for ${grade} ${subject}...`;
        const result = await model.generateContent(prompt);
        return new Response(cleanJson((await result.response).text()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'generate-worksheet') {
        const { subject, grade, assessmentTitle, findings } = payload;
        
        const prompt = `
            Create a "Learning Bridge" Remediation Worksheet for a ${grade} ${subject} class based on the following diagnostic findings from the "${assessmentTitle}" assessment:
            
            DIAGNOSTIC DATA (Root Causes & Interventions):
            ${JSON.stringify(findings)}
            
            Instructions:
            1. Create a conceptual bridge between the identified gaps and the target mastery level.
            2. The output should be professional Markdown.
            3. Section 1: Concept Recap. A clear, concise explanation of the most problematic concepts identified. Use scaffolding (bullet points, simple steps).
            4. Section 2: Command Verb Guidance. If keywords like "Compare" or "Evaluate" were misunderstood, provide a "How to answer" tip for those specific words.
            5. Section 3: Worked Example. Provide one step-by-step example.
            6. Section 4: Focused Practice. Create 4-5 practice questions that specifically target the root causes.
            7. Tone: Constructive, supportive, and academically rigorous for the grade level.
            8. Include a header with "LEARNING BRIDGE: [Assessment Title] Remediation".
        `;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response).text();
        return new Response(JSON.stringify({ worksheet: responseText }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    throw new Error(`Action ${action} not implemented.`);

  } catch (error) {
    console.error("[gemini-ai] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});