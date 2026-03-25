-- Add term_id to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS term_id UUID;

-- Add year_id and term_id to learner_notes
ALTER TABLE public.learner_notes ADD COLUMN IF NOT EXISTS year_id UUID;
ALTER TABLE public.learner_notes ADD COLUMN IF NOT EXISTS term_id UUID;

-- Add year_id and term_id to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS year_id UUID;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS term_id UUID;

-- Add year_id and term_id to todos
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS year_id UUID;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS term_id UUID;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_term_id ON public.attendance(term_id);
CREATE INDEX IF NOT EXISTS idx_learner_notes_term_id ON public.learner_notes(term_id);
CREATE INDEX IF NOT EXISTS idx_activities_term_id ON public.activities(term_id);
CREATE INDEX IF NOT EXISTS idx_todos_term_id ON public.todos(term_id);