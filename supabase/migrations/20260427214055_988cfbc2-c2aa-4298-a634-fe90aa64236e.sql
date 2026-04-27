-- Table to record anonymous→authenticated ID linking events (for audit + idempotency)
CREATE TABLE IF NOT EXISTS public.anonymous_gap_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  user_id uuid NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  attempts_moved int NOT NULL DEFAULT 0,
  gaps_moved int NOT NULL DEFAULT 0,
  misconceptions_moved int NOT NULL DEFAULT 0,
  UNIQUE (anonymous_id, user_id)
);

ALTER TABLE public.anonymous_gap_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own migration links"
  ON public.anonymous_gap_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own migration links"
  ON public.anonymous_gap_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Migration function: callable by an authenticated user to claim an anonymous trail
CREATE OR REPLACE FUNCTION public.migrate_anonymous_data(_anonymous_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_text text;
  _attempts_moved int := 0;
  _gaps_moved int := 0;
  _misc_moved int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  IF _anonymous_id IS NULL OR length(_anonymous_id) < 4 THEN
    RETURN jsonb_build_object('error', 'invalid_anonymous_id');
  END IF;
  _user_text := _user_id::text;
  IF _anonymous_id = _user_text THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'same_id');
  END IF;

  -- Move attempts
  UPDATE public.attempts
     SET student_id = _user_text
   WHERE student_id = _anonymous_id;
  GET DIAGNOSTICS _attempts_moved = ROW_COUNT;

  -- Merge knowledge gaps (sum occurrences, keep latest dates) using ON CONFLICT on the unique index
  WITH src AS (
    DELETE FROM public.student_knowledge_gaps
     WHERE student_id = _anonymous_id
    RETURNING topic, severity, misconception_type, skill_id, occurrence_count, last_occurred_at, detected_at
  )
  INSERT INTO public.student_knowledge_gaps
    (student_id, topic, severity, misconception_type, skill_id, occurrence_count, last_occurred_at, detected_at)
  SELECT _user_text, topic, severity, misconception_type, skill_id, occurrence_count, last_occurred_at, detected_at
    FROM src
   ON CONFLICT (student_id, misconception_type, topic) WHERE misconception_type IS NOT NULL
   DO UPDATE SET
     occurrence_count = public.student_knowledge_gaps.occurrence_count + EXCLUDED.occurrence_count,
     last_occurred_at = GREATEST(public.student_knowledge_gaps.last_occurred_at, EXCLUDED.last_occurred_at),
     severity = EXCLUDED.severity;
  GET DIAGNOSTICS _gaps_moved = ROW_COUNT;

  -- Move misconception counters (sum if both exist)
  WITH src AS (
    DELETE FROM public.misconception_counters
     WHERE student_id = _anonymous_id
    RETURNING misconception_type, count, last_seen_at
  ),
  upserted AS (
    INSERT INTO public.misconception_counters (student_id, misconception_type, count, last_seen_at)
    SELECT _user_text, misconception_type, count, last_seen_at FROM src
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _misc_moved FROM upserted;

  -- Move activity log entries
  UPDATE public.student_activity_log
     SET student_id = _user_text
   WHERE student_id = _anonymous_id;

  -- Audit
  INSERT INTO public.anonymous_gap_links
    (anonymous_id, user_id, attempts_moved, gaps_moved, misconceptions_moved)
  VALUES
    (_anonymous_id, _user_id, _attempts_moved, _gaps_moved, _misc_moved)
  ON CONFLICT (anonymous_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'attempts_moved', _attempts_moved,
    'gaps_moved', _gaps_moved,
    'misconceptions_moved', _misc_moved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_anonymous_data(text) TO authenticated;