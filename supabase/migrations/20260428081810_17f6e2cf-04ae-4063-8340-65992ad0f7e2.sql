CREATE TABLE IF NOT EXISTS public.kb_geometry_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text NOT NULL,
  text_sample text NOT NULL,
  exercise_id uuid,
  user_id uuid,
  givens jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{label, value, kind}]
  goal text DEFAULT '',
  shape_hint text DEFAULT '',                        -- triangle/circle/...
  relations jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{kind, labels, note}]
  tags text[] NOT NULL DEFAULT '{}',
  notes text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_geometry_enrichments_hash_idx
  ON public.kb_geometry_enrichments (text_hash);
CREATE INDEX IF NOT EXISTS kb_geometry_enrichments_user_idx
  ON public.kb_geometry_enrichments (user_id);
CREATE INDEX IF NOT EXISTS kb_geometry_enrichments_tags_idx
  ON public.kb_geometry_enrichments USING GIN (tags);

ALTER TABLE public.kb_geometry_enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrichments readable by all"
  ON public.kb_geometry_enrichments FOR SELECT USING (true);

CREATE POLICY "Auth can insert own enrichments"
  ON public.kb_geometry_enrichments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can update enrichments"
  ON public.kb_geometry_enrichments FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners or admins can delete enrichments"
  ON public.kb_geometry_enrichments FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_kb_geometry_enrichments_updated_at
BEFORE UPDATE ON public.kb_geometry_enrichments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();