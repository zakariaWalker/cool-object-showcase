ALTER TABLE public.kb_exercises ADD COLUMN IF NOT EXISTS ai_deconstructed boolean DEFAULT false;
ALTER TABLE public.kb_deconstructions ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;
UPDATE public.kb_exercises SET ai_deconstructed = true WHERE id IN (SELECT DISTINCT exercise_id FROM public.kb_deconstructions);