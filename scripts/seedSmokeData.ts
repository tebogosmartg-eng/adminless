import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://whfnuntkisnksxhtepqn.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZm51bnRraXNua3N4aHRlcHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzMxMjksImV4cCI6MjA4NDc0OTEyOX0.exARgqyfblrG1n1fuVzmCt7IECCFKWofeXXDxN8NRws";

const TARGET_EMAIL =
  process.env.PLAYWRIGHT_EMAIL ?? "info.hasawards@gmail.com";
const TARGET_PASSWORD =
  process.env.PLAYWRIGHT_PASSWORD ?? "Hasa@123";

const YEAR_NAME = "2026";
const TERM_NAME = "Term 2";
const CLASS_NAME = "Smoke Grade 10A";
const ASSESSMENT_TITLE = "Smoke Baseline Test";

const LEARNER_NAMES = [
  "Amina Dlamini",
  "Neo Mokoena",
  "Thabo Khumalo",
  "Lerato Nkosi",
  "Kagiso Molefe",
];

const QUESTION_DEFS = [
  { question_number: "1", skill_description: "Recall key concepts", max_mark: 10 },
  { question_number: "2", skill_description: "Apply procedure", max_mark: 10 },
  { question_number: "3", skill_description: "Interpret result", max_mark: 10 },
];

type AnyRow = Record<string, unknown>;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function requireAuthUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
  });
  if (error || !data.user) {
    throw new Error(`Auth failed for ${TARGET_EMAIL}: ${error?.message ?? "unknown auth error"}`);
  }
  return data.user;
}

async function ensureAcademicYear(userId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("academic_years")
    .select("*")
    .eq("user_id", userId)
    .eq("name", YEAR_NAME)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (existing) return existing;

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: YEAR_NAME,
    closed: false,
  };
  const { data, error } = await supabase
    .from("academic_years")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureTerm(userId: string, yearId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("terms")
    .select("*")
    .eq("user_id", userId)
    .eq("year_id", yearId)
    .eq("name", TERM_NAME)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing;

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    year_id: yearId,
    name: TERM_NAME,
    start_date: null,
    end_date: null,
    closed: false,
    weight: 25,
  };
  const { data, error } = await supabase
    .from("terms")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureClass(userId: string, yearId: string, termId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("classes")
    .select("*")
    .eq("user_id", userId)
    .eq("year_id", yearId)
    .eq("term_id", termId)
    .eq("class_name", CLASS_NAME)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (existing) {
    if (existing.archived) {
      const { error: unarchiveErr } = await supabase
        .from("classes")
        .update({ archived: false })
        .eq("id", existing.id);
      if (unarchiveErr) throw unarchiveErr;
      return { ...existing, archived: false };
    }
    return existing;
  }

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    year_id: yearId,
    term_id: termId,
    grade: "Grade 10",
    subject: "Mathematics",
    class_name: CLASS_NAME,
    archived: false,
    notes: "Seeded for deterministic Playwright smoke tests.",
  };
  const { data, error } = await supabase
    .from("classes")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureLearners(classId: string) {
  const { data: existingRows, error: fetchErr } = await supabase
    .from("learners")
    .select("*")
    .eq("class_id", classId);
  if (fetchErr) throw fetchErr;

  const existing = existingRows ?? [];
  const byName = new Map(existing.map((row: AnyRow) => [String(row.name), row]));

  for (const name of LEARNER_NAMES) {
    if (byName.has(name)) continue;
    const { error: insErr } = await supabase.from("learners").insert({
      id: crypto.randomUUID(),
      class_id: classId,
      name,
      gender: null,
      mark: null,
      comment: null,
    });
    if (insErr) throw insErr;
  }

  const { data: learners, error: refetchErr } = await supabase
    .from("learners")
    .select("*")
    .eq("class_id", classId)
    .order("name", { ascending: true });
  if (refetchErr) throw refetchErr;
  return learners ?? [];
}

async function ensureAssessment(userId: string, classId: string, termId: string, yearId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", userId)
    .eq("class_id", classId)
    .eq("term_id", termId)
    .eq("title", ASSESSMENT_TITLE)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (existing) {
    const { error: upErr } = await supabase
      .from("assessments")
      .update({
        max_mark: 30,
        weight: 100,
        type: "Class Test",
      })
      .eq("id", existing.id);
    if (upErr) throw upErr;
    return existing.id as string;
  }

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    class_id: classId,
    term_id: termId,
    academic_year_id: yearId,
    title: ASSESSMENT_TITLE,
    type: "Class Test",
    max_mark: 30,
    weight: 100,
    date: isoDateDaysAgo(1),
    rubric_id: null,
  };
  const { data, error } = await supabase
    .from("assessments")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureQuestions(userId: string, assessmentId: string) {
  const { data: rows, error: fetchErr } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("question_number", { ascending: true });
  if (fetchErr) throw fetchErr;

  if (!rows || rows.length === 0) {
    const payload = QUESTION_DEFS.map((q) => ({
      id: crypto.randomUUID(),
      assessment_id: assessmentId,
      user_id: userId,
      question_number: q.question_number,
      skill_description: q.skill_description,
      max_mark: q.max_mark,
      topic: "Smoke Seed",
      cognitive_level: "application",
    }));
    const { error: insErr } = await supabase.from("assessment_questions").insert(payload);
    if (insErr) throw insErr;
  }

  const { data: ensured, error: refetchErr } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("question_number", { ascending: true });
  if (refetchErr) throw refetchErr;
  return ensured ?? [];
}

async function ensureMarks(
  userId: string,
  assessmentId: string,
  learners: AnyRow[],
  questions: AnyRow[]
) {
  const questionIds = questions.map((q) => String(q.id));
  for (let i = 0; i < learners.length; i += 1) {
    const learnerId = String(learners[i].id);
    const scores = [7 + (i % 3), 8 + ((i + 1) % 2), 6 + (i % 4)];
    const questionMarks: Record<string, number> = {};
    questionIds.forEach((qid, idx) => {
      questionMarks[qid] = scores[idx] ?? 8;
    });
    const totalScore = Object.values(questionMarks).reduce((sum, v) => sum + v, 0);

    const { data: existing, error: fetchErr } = await supabase
      .from("assessment_marks")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("learner_id", learnerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const payload = {
      user_id: userId,
      assessment_id: assessmentId,
      learner_id: learnerId,
      score: totalScore,
      comment: "Seeded mark for smoke tests",
      question_marks: questionMarks,
      rubric_selections: null,
    };

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("assessment_marks")
        .update(payload)
        .eq("id", existing.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase.from("assessment_marks").insert(payload);
      if (insErr) throw insErr;
    }
  }
}

async function ensureAttendance(
  userId: string,
  classId: string,
  termId: string,
  learners: AnyRow[]
) {
  const targetDates = [isoDateDaysAgo(1), isoDateDaysAgo(2)];
  const statuses = ["present", "late"] as const;

  for (const learner of learners) {
    const learnerId = String(learner.id);
    for (let i = 0; i < targetDates.length; i += 1) {
      const date = targetDates[i];
      const status = statuses[i % statuses.length];
      const { data: existing, error: fetchErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", userId)
        .eq("class_id", classId)
        .eq("term_id", termId)
        .eq("learner_id", learnerId)
        .eq("date", date)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from("attendance")
          .update({ status })
          .eq("id", existing.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("attendance").insert({
          id: crypto.randomUUID(),
          user_id: userId,
          class_id: classId,
          term_id: termId,
          learner_id: learnerId,
          date,
          status,
        });
        if (insErr) throw insErr;
      }
    }
  }
}

async function ensureDiagnosticFallback(userId: string, assessmentId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const payload = {
    user_id: userId,
    assessment_id: assessmentId,
    findings: [
      {
        question: "Q1",
        performance_summary: "Baseline diagnostic seeded.",
        possible_root_causes: ["Initial baseline variability"],
        targeted_interventions: ["Targeted practice and revision"],
      },
    ],
    interventions: {
      themes: ["Foundational skills"],
      interventions: ["Weekly focused remediation"],
    },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from("diagnostics")
      .update(payload)
      .eq("id", existing.id);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from("diagnostics").insert(payload);
    if (insErr) throw insErr;
  }
}

async function main() {
  console.log(`[seed:smoke] start for ${TARGET_EMAIL}`);

  const user = await requireAuthUser();
  const { data: existingTerms, error: termsErr } = await supabase
    .from("terms")
    .select("*")
    .eq("user_id", user.id);
  if (termsErr) throw termsErr;

  let targetTerms = existingTerms ?? [];
  if (targetTerms.length === 0) {
    const year = await ensureAcademicYear(user.id);
    const term = await ensureTerm(user.id, String(year.id));
    targetTerms = [term];
  }

  let seededClassCount = 0;
  let seededAssessmentCount = 0;
  for (const term of targetTerms) {
    const yearId = String(term.year_id);
    const termId = String(term.id);

    const klass = await ensureClass(user.id, yearId, termId);
    const learners = await ensureLearners(String(klass.id));
    const assessmentId = await ensureAssessment(user.id, String(klass.id), termId, yearId);
    const questions = await ensureQuestions(user.id, assessmentId);
    await ensureMarks(user.id, assessmentId, learners, questions);
    await ensureAttendance(user.id, String(klass.id), termId, learners);
    await ensureDiagnosticFallback(user.id, assessmentId);

    seededClassCount += 1;
    seededAssessmentCount += 1;
  }

  console.log("[seed:smoke] done");
  console.log(`[seed:smoke] terms covered=${targetTerms.length}`);
  console.log(`[seed:smoke] classes ensured=${seededClassCount}`);
  console.log(`[seed:smoke] assessments ensured=${seededAssessmentCount}`);
}

main().catch((error) => {
  console.error("[seed:smoke] failed", error);
  process.exit(1);
});
