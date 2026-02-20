-- 1. Add missing columns to existing tables
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.assessment_marks ADD COLUMN IF NOT EXISTS question_marks JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS term_id UUID;

-- Assessments likely needs rubric_id and task_slot_key as well
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS rubric_id UUID;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS task_slot_key TEXT;

-- 2. Create missing tables

-- Scan History
CREATE TABLE IF NOT EXISTS public.scan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID,
    assessment_id UUID,
    academic_year_id UUID,
    term_id UUID,
    scan_type TEXT,
    replacement_mode TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    file_path TEXT,
    before_snapshot JSONB,
    after_snapshot JSONB
);
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scan history" ON public.scan_history
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Diagnostics
CREATE TABLE IF NOT EXISTS public.diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID,
    findings JSONB,
    interventions JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own diagnostics" ON public.diagnostics
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Remediation Tasks
CREATE TABLE IF NOT EXISTS public.remediation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID,
    term_id UUID,
    assessment_id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.remediation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own remediation tasks" ON public.remediation_tasks
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Moderation Samples
CREATE TABLE IF NOT EXISTS public.moderation_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID,
    term_id UUID,
    class_id UUID,
    assessment_id UUID,
    rules_json JSONB,
    learner_ids JSONB, -- Storing array of strings as JSONB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.moderation_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own moderation samples" ON public.moderation_samples
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lesson Logs
CREATE TABLE IF NOT EXISTS public.lesson_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timetable_id UUID,
    date DATE,
    content TEXT,
    homework TEXT,
    topic_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.lesson_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lesson logs" ON public.lesson_logs
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Curriculum Topics
CREATE TABLE IF NOT EXISTS public.curriculum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT,
    grade TEXT,
    term_id UUID,
    title TEXT,
    description TEXT,
    "order" INTEGER
);
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own curriculum topics" ON public.curriculum_topics
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rubrics
CREATE TABLE IF NOT EXISTS public.rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    criteria JSONB,
    total_points NUMERIC
);
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own rubrics" ON public.rubrics
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Teacher File Annotations
CREATE TABLE IF NOT EXISTS public.teacher_file_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID,
    term_id UUID,
    section_key TEXT,
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.teacher_file_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own annotations" ON public.teacher_file_annotations
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Teacher File Attachments
CREATE TABLE IF NOT EXISTS public.teacher_file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID,
    term_id UUID,
    section_key TEXT,
    class_id UUID,
    assessment_id UUID,
    file_path TEXT,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.teacher_file_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own file attachments" ON public.teacher_file_attachments
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);