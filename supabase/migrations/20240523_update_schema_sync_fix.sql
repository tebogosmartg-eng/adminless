-- Fix Schema Sync Errors

-- 1. Add missing columns to 'activities' and 'attendance'
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE;

-- 2. Create 'moderation_samples' table
CREATE TABLE IF NOT EXISTS public.moderation_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
    rules_json JSONB DEFAULT '{}'::jsonb,
    learner_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.moderation_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own moderation samples" ON public.moderation_samples
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Create 'remediation_tasks' table
CREATE TABLE IF NOT EXISTS public.remediation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.remediation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own remediation tasks" ON public.remediation_tasks
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Create 'scan_history' table
CREATE TABLE IF NOT EXISTS public.scan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    scan_type TEXT NOT NULL,
    replacement_mode TEXT DEFAULT 'standard',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'completed',
    file_path TEXT,
    before_snapshot JSONB,
    after_snapshot JSONB
);

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scan history" ON public.scan_history
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Create 'teacher_file_annotations' table
CREATE TABLE IF NOT EXISTS public.teacher_file_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.teacher_file_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own annotations" ON public.teacher_file_annotations
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Create 'teacher_file_attachments' table
CREATE TABLE IF NOT EXISTS public.teacher_file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.teacher_file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attachments" ON public.teacher_file_attachments
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Add 'task_slot_key' to assessments for Teacher File mapping
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS task_slot_key TEXT;