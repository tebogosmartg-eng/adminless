-- Older databases may lack classes.is_finalised; lock triggers/functions require it.
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_finalised BOOLEAN DEFAULT false;
