-- Block assessment / question metadata mutations when class or term is locked.

CREATE OR REPLACE FUNCTION public.block_locked_assessments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cid uuid;
  tid uuid;
BEGIN
  cid := COALESCE(NEW.class_id, OLD.class_id);
  tid := COALESCE(NEW.term_id, OLD.term_id);

  IF cid IS NOT NULL AND public.is_class_or_term_locked(cid, tid) THEN
    RAISE EXCEPTION 'Term is locked. assessments are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_assessments ON public.assessments;
CREATE TRIGGER trg_block_locked_assessments
BEFORE INSERT OR UPDATE OR DELETE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_assessments();

CREATE OR REPLACE FUNCTION public.block_locked_assessment_questions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  aid uuid;
  cid uuid;
  tid uuid;
BEGIN
  aid := COALESCE(NEW.assessment_id, OLD.assessment_id);

  SELECT a.class_id, a.term_id
  INTO cid, tid
  FROM public.assessments a
  WHERE a.id = aid
  LIMIT 1;

  IF cid IS NOT NULL AND public.is_class_or_term_locked(cid, tid) THEN
    RAISE EXCEPTION 'Term is locked. assessment_questions are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_assessment_questions ON public.assessment_questions;
CREATE TRIGGER trg_block_locked_assessment_questions
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_questions
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_assessment_questions();
