-- Learned geometry contexts: every time a user successfully verifies a figure,
-- the (normalized text → spec + constraints) pair is upserted here so the
-- KB analyzer can reuse it next time with maximum confidence.

CREATE TABLE IF NOT EXISTS public.kb_geometry_learned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text NOT NULL,
  text_sample text NOT NULL,
  exercise_id uuid,
  figure_kind text,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption text DEFAULT '',
  success_count integer NOT NULL DEFAULT 1,
  last_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_geometry_learned_hash_uidx
  ON public.kb_geometry_learned (text_hash);

CREATE INDEX IF NOT EXISTS kb_geometry_learned_exercise_idx
  ON public.kb_geometry_learned (exercise_id);

ALTER TABLE public.kb_geometry_learned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learned figures readable by all"
  ON public.kb_geometry_learned FOR SELECT USING (true);

CREATE POLICY "Auth can insert learned figures"
  ON public.kb_geometry_learned FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can update learned figures"
  ON public.kb_geometry_learned FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete learned figures"
  ON public.kb_geometry_learned FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_kb_geometry_learned_updated_at
BEFORE UPDATE ON public.kb_geometry_learned
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();