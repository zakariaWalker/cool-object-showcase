-- 1) Server-side misconception counters (replaces localStorage)
CREATE TABLE IF NOT EXISTS public.misconception_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  misconception_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, misconception_type)
);

ALTER TABLE public.misconception_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own counters"
  ON public.misconception_counters FOR SELECT
  USING (auth.uid()::text = student_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Students can insert own counters"
  ON public.misconception_counters FOR INSERT
  WITH CHECK (auth.uid()::text = student_id);

CREATE POLICY "Students can update own counters"
  ON public.misconception_counters FOR UPDATE
  USING (auth.uid()::text = student_id);

CREATE TRIGGER update_misconception_counters_updated_at
  BEFORE UPDATE ON public.misconception_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Diagnostic exercises cache (24h TTL)
CREATE TABLE IF NOT EXISTS public.diagnostic_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL,
  country_code TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'kb',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache readable by all"
  ON public.diagnostic_cache FOR SELECT
  USING (true);

CREATE POLICY "Auth can write cache"
  ON public.diagnostic_cache FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can update cache"
  ON public.diagnostic_cache FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_diagnostic_cache_lookup
  ON public.diagnostic_cache (level, country_code, expires_at);

-- 3) Index on student_knowledge_gaps for upsert path used by tracker
CREATE UNIQUE INDEX IF NOT EXISTS idx_skg_student_misc_topic
  ON public.student_knowledge_gaps (student_id, misconception_type, topic)
  WHERE misconception_type IS NOT NULL;