import { ClassInfo, Learner, ClassInsight, LearnerComment, ScanMode, DiagnosticRow, FullDiagnostic } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

const invokeGemini = async (action: string, payload: any) => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${SUPABASE_URL}/functions/v1/gemini-ai`;

  if (action === 'generate-diagnostic') {
    console.log('[diagnostic] payload to edge', { action, payload });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action, payload })
  });

  const responseText = await response.text();

  if (action === 'generate-diagnostic') {
    console.log('[diagnostic] edge status', response.status, 'body', responseText);
  }

  let jsonResponse: any = null;
  try { jsonResponse = JSON.parse(responseText); } catch (e) {}

  if (!response.ok) throw new Error(jsonResponse?.error || "AI Service Error");
  if (!jsonResponse.success) throw new Error(jsonResponse.error || "AI failed to process request.");

  return jsonResponse.data;
};

export const processImagesWithGemini = async (images: string[], assessmentSchema: any): Promise<any> => {
  return invokeGemini('scan-images', { images, assessmentSchema });
};

export const scanRosterWithGemini = async (images: string[]): Promise<any> => {
  return invokeGemini('scan-roster', { images });
};

export const generateClassInsights = async (classInfo: ClassInfo, learners: Learner[], assessmentData: any): Promise<ClassInsight> => {
  return invokeGemini('generate-insights', { subject: classInfo.subject, grade: classInfo.grade, learners, assessmentData });
};

const normalizeDiagnosticRow = (row: any, index: number): DiagnosticRow => {
  const possibleRootCauses = Array.isArray(row?.possible_root_causes)
    ? row.possible_root_causes
    : Array.isArray(row?.root_causes)
      ? row.root_causes
      : [];
  const targetedInterventions = Array.isArray(row?.targeted_interventions)
    ? row.targeted_interventions
    : Array.isArray(row?.interventions)
      ? row.interventions
      : Array.isArray(row?.priority_actions)
        ? row.priority_actions
        : [];

  return {
    id: String(row?.id ?? `diag-${index + 1}`),
    question: String(row?.question ?? row?.topic ?? `Question ${index + 1}`),
    performance_summary: String(row?.performance_summary ?? row?.summary ?? ""),
    cognitive_level: row?.cognitive_level,
    possible_root_causes: possibleRootCauses.filter((v: unknown) => typeof v === "string"),
    targeted_interventions: targetedInterventions.filter((v: unknown) => typeof v === "string"),
  };
};

const normalizeDiagnosticResponse = (data: any): FullDiagnostic => {
  if (data && Array.isArray(data.rows)) {
    return {
      rows: data.rows.map(normalizeDiagnosticRow),
      overall_class_themes: Array.isArray(data.overall_class_themes) ? data.overall_class_themes : [],
      overall_interventions: Array.isArray(data.overall_interventions) ? data.overall_interventions : [],
    };
  }

  const findings = Array.isArray(data?.findings) ? data.findings : [];
  const rows = findings.map((finding: any, index: number) =>
    normalizeDiagnosticRow(
      {
        ...finding,
        performance_summary: finding?.performance_summary ?? finding?.summary,
        targeted_interventions: finding?.targeted_interventions ?? finding?.priority_actions,
      },
      index
    )
  );

  return {
    rows,
    overall_class_themes: typeof data?.summary === "string" && data.summary.trim()
      ? [data.summary.trim()]
      : [],
    overall_interventions: Array.isArray(data?.priorityActions)
      ? data.priorityActions.filter((v: unknown) => typeof v === "string")
      : [],
  };
};

export const generateAIDiagnostic = async (assessment: any, stats: any, subject: string, grade: string): Promise<FullDiagnostic> => {
  const rawData = await invokeGemini('generate-diagnostic', { assessment, stats, subject, grade });
  const normalized = normalizeDiagnosticResponse(rawData);
  const rows = Array.isArray(normalized.rows) ? normalized.rows : [];
  const themes = Array.isArray(normalized.overall_class_themes) ? normalized.overall_class_themes : [];
  const interventions = Array.isArray(normalized.overall_interventions) ? normalized.overall_interventions : [];
  return {
    rows,
    overall_class_themes: themes,
    overall_interventions: interventions,
  };
};

export const generateRemediationWorksheet = async (subject: string, grade: string, assessmentTitle: string, findings: DiagnosticRow[]): Promise<string> => {
    const data = await invokeGemini('generate-worksheet', { subject, grade, assessmentTitle, findings });
    return data?.worksheet || "Could not generate worksheet.";
};

export const generateLearnerReport = async (learner: Learner, classInfo: ClassInfo, assessmentData: any): Promise<string> => {
    const data = await invokeGemini('generate-report', { learner, classInfo, assessmentData });
    return data?.report || "Could not generate report.";
};

export const generateBulkComments = async (learners: Learner[], tone: string): Promise<LearnerComment[]> => {
    const data = await invokeGemini('generate-bulk-comments', { learners, tone });
    return data?.comments || [];
};

export const translateTextWithGemini = async (text: string, languageCode: string): Promise<string> => {
    if (!text || !text.trim() || languageCode === 'en' || !languageCode) return text;

    try {
        const { data: cached } = await supabase
            .from('translation_cache')
            .select('translated_text')
            .eq('original_text', text)
            .eq('language_code', languageCode)
            .maybeSingle();

        if (cached?.translated_text) {
            return cached.translated_text;
        }

        const data = await invokeGemini('translate-text', { text, languageCode });
        const translatedText = data?.translatedText || text;

        if (translatedText && translatedText !== text) {
            await supabase
                .from('translation_cache')
                .upsert({
                    original_text: text,
                    language_code: languageCode,
                    translated_text: translatedText
                }, { onConflict: 'original_text,language_code' });
        }

        return translatedText;
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
};