-- Add new columns to profiles for pilot tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_source TEXT;

-- Update the handle_new_user function to map metadata from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    teacher_name, 
    school_name, 
    role, 
    grades, 
    subjects, 
    marketing_source,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'school_name', 'My School'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'Teacher'),
    COALESCE((new.raw_user_meta_data -> 'grades')::jsonb, '[]'::jsonb),
    COALESCE((new.raw_user_meta_data -> 'subjects')::jsonb, '[]'::jsonb),
    new.raw_user_meta_data ->> 'marketing_source',
    NOW()
  );
  RETURN new;
END;
$$;