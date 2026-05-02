-- Enforce term/class lock at DB layer for critical teacher mutations.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_finalised BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_class_or_term_locked(target_class_id uuid, target_term_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  locked boolean := false;
BEGIN
  SELECT COALESCE(c.is_finalised, false) OR COALESCE(t.closed, false)
  INTO locked
  FROM public.classes c
  LEFT JOIN public.terms t ON t.id = COALESCE(target_term_id, c.term_id)
  WHERE c.id = target_class_id
  LIMIT 1;

  RETURN COALESCE(locked, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.block_locked_assessment_marks()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_assessment_id uuid;
  target_class_id uuid;
  target_term_id uuid;
BEGIN
  target_assessment_id := COALESCE(NEW.assessment_id, OLD.assessment_id);

  SELECT a.class_id, a.term_id
  INTO target_class_id, target_term_id
  FROM public.assessments a
  WHERE a.id = target_assessment_id
  LIMIT 1;

  IF target_class_id IS NOT NULL AND public.is_class_or_term_locked(target_class_id, target_term_id) THEN
    RAISE EXCEPTION 'Term is locked. assessment_marks is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_assessment_marks ON public.assessment_marks;
CREATE TRIGGER trg_block_locked_assessment_marks
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_marks
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_assessment_marks();

CREATE OR REPLACE FUNCTION public.block_locked_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_class_id uuid;
  target_term_id uuid;
BEGIN
  target_class_id := COALESCE(NEW.class_id, OLD.class_id);
  target_term_id := COALESCE(NEW.term_id, OLD.term_id);

  IF target_class_id IS NOT NULL AND public.is_class_or_term_locked(target_class_id, target_term_id) THEN
    RAISE EXCEPTION 'Term is locked. attendance is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_attendance ON public.attendance;
CREATE TRIGGER trg_block_locked_attendance
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_attendance();

CREATE OR REPLACE FUNCTION public.block_locked_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_class_id uuid;
  target_term_id uuid;
BEGIN
  target_class_id := COALESCE(NEW.class_id, OLD.class_id);
  target_term_id := COALESCE(NEW.term_id, OLD.term_id);

  IF target_class_id IS NOT NULL AND public.is_class_or_term_locked(target_class_id, target_term_id) THEN
    RAISE EXCEPTION 'Term is locked. evidence is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_evidence ON public.evidence;
CREATE TRIGGER trg_block_locked_evidence
BEFORE INSERT OR UPDATE OR DELETE ON public.evidence
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_evidence();

CREATE OR REPLACE FUNCTION public.block_locked_learner_marks_comments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_class_id uuid;
  mark_changed boolean;
  comment_changed boolean;
BEGIN
  target_class_id := COALESCE(NEW.class_id, OLD.class_id);
  mark_changed := TG_OP <> 'DELETE' AND NEW.mark IS DISTINCT FROM OLD.mark;
  comment_changed := TG_OP <> 'DELETE' AND NEW.comment IS DISTINCT FROM OLD.comment;

  IF (mark_changed OR comment_changed)
     AND target_class_id IS NOT NULL
     AND public.is_class_or_term_locked(target_class_id, NULL) THEN
    RAISE EXCEPTION 'Term is locked. learner marks/comments are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_learner_marks_comments ON public.learners;
CREATE TRIGGER trg_block_locked_learner_marks_comments
BEFORE UPDATE ON public.learners
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_learner_marks_comments();
