-- Add country_code to deconstructions for per-country isolation
ALTER TABLE public.kb_deconstructions 
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'DZ';

CREATE INDEX IF NOT EXISTS idx_kb_deconstructions_country ON public.kb_deconstructions(country_code);
CREATE INDEX IF NOT EXISTS idx_kb_exercises_country ON public.kb_exercises(country_code);

-- Backfill existing deconstructions: inherit from their exercise's country
UPDATE public.kb_deconstructions d
SET country_code = e.country_code
FROM public.kb_exercises e
WHERE d.exercise_id = e.id AND d.country_code = 'DZ' AND e.country_code IS NOT NULL;