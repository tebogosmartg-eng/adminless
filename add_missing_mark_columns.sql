-- Add missing JSONB columns to assessment_marks to store granular question data and rubric selections
ALTER TABLE public.assessment_marks ADD COLUMN IF NOT EXISTS question_marks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.assessment_marks ADD COLUMN IF NOT EXISTS rubric_selections JSONB DEFAULT '{}'::jsonb;