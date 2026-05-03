-- Amendment sessions: tracked, server-side bypass for class/term lock triggers.
-- A teacher opens a session for a finalised class; lock triggers honour the
-- open session for that (user, class) pair, allowing edits while preserving
-- a full audit trail.

CREATE TABLE IF NOT EXISTS public.amendment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS amendment_sessions_open_unique
  ON public.amendment_sessions (class_id, user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS amendment_sessions_user_class_open_idx
  ON public.amendment_sessions (user_id, class_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.amendment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS amendment_sessions_select_own ON public.amendment_sessions;
CREATE POLICY amendment_sessions_select_own
  ON public.amendment_sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS amendment_sessions_insert_own ON public.amendment_sessions;
CREATE POLICY amendment_sessions_insert_own
  ON public.amendment_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS amendment_sessions_update_own ON public.amendment_sessions;
CREATE POLICY amendment_sessions_update_own
  ON public.amendment_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- begin_amendment_session: closes any stale open session for the same
-- (user_id, class_id) before inserting a fresh one. Returns the new session id.
CREATE OR REPLACE FUNCTION public.begin_amendment_session(
  p_class_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'class_id is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Class not found or not owned by caller.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.amendment_sessions
  SET ended_at = now(),
      metadata = metadata || jsonb_build_object('auto_closed_reason', 'superseded')
  WHERE user_id = v_user_id
    AND class_id = p_class_id
    AND ended_at IS NULL;

  INSERT INTO public.amendment_sessions (user_id, class_id, reason)
  VALUES (v_user_id, p_class_id, p_reason)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_amendment_session(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_amendment_session(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_amendment_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  UPDATE public.amendment_sessions
  SET ended_at = now()
  WHERE id = p_session_id
    AND user_id = v_user_id
    AND ended_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.end_amendment_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_amendment_session(uuid) TO authenticated;

-- has_open_amendment_session: cheap check used by trigger functions.
CREATE OR REPLACE FUNCTION public.has_open_amendment_session(
  target_class_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.amendment_sessions
    WHERE class_id = target_class_id
      AND user_id = target_user_id
      AND ended_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.has_open_amendment_session(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_open_amendment_session(uuid, uuid) TO authenticated;

-- User-aware lock check: returns false (i.e. NOT locked) when the caller has
-- an open amendment session for the class. Otherwise delegates to the
-- existing class/term lock check.
CREATE OR REPLACE FUNCTION public.is_class_or_term_locked_for_user(
  target_class_id uuid,
  target_term_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_locked boolean;
BEGIN
  IF target_class_id IS NULL THEN
    RETURN false;
  END IF;

  base_locked := public.is_class_or_term_locked(target_class_id, target_term_id);
  IF NOT base_locked THEN
    RETURN false;
  END IF;

  IF target_user_id IS NOT NULL
     AND public.has_open_amendment_session(target_class_id, target_user_id) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.is_class_or_term_locked_for_user(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_class_or_term_locked_for_user(uuid, uuid, uuid) TO authenticated;

-- Recreate trigger functions to honour amendment sessions for the
-- caller (auth.uid()).

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

  IF target_class_id IS NOT NULL
     AND public.is_class_or_term_locked_for_user(target_class_id, target_term_id, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. assessment_marks is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

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

  IF target_class_id IS NOT NULL
     AND public.is_class_or_term_locked_for_user(target_class_id, target_term_id, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. attendance is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

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

  IF target_class_id IS NOT NULL
     AND public.is_class_or_term_locked_for_user(target_class_id, target_term_id, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. evidence is read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

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
     AND public.is_class_or_term_locked_for_user(target_class_id, NULL, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. learner marks/comments are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

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

  IF cid IS NOT NULL
     AND public.is_class_or_term_locked_for_user(cid, tid, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. assessments are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

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

  IF cid IS NOT NULL
     AND public.is_class_or_term_locked_for_user(cid, tid, auth.uid()) THEN
    RAISE EXCEPTION 'Term is locked. assessment_questions are read-only for this class.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
