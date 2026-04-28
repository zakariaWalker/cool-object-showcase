
CREATE TABLE IF NOT EXISTS public.diagnostic_question_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash text NOT NULL,
  question_preview text NOT NULL,
  country_code text NOT NULL DEFAULT 'DZ',
  grade_code text NOT NULL,
  reason text NOT NULL DEFAULT 'bad_quality',
  notes text DEFAULT '',
  flagged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_hash, country_code, grade_code)
);

CREATE INDEX IF NOT EXISTS idx_dqf_lookup
  ON public.diagnostic_question_flags (country_code, grade_code, question_hash);

ALTER TABLE public.diagnostic_question_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flags readable by all"
  ON public.diagnostic_question_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert flags"
  ON public.diagnostic_question_flags FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update flags"
  ON public.diagnostic_question_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete flags"
  ON public.diagnostic_question_flags FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
