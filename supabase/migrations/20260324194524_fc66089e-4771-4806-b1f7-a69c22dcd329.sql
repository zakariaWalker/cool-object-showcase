-- KB Exercises table (classification workflow)
CREATE TABLE public.kb_exercises (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'unclassified',
  chapter TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  stream TEXT DEFAULT '',
  label TEXT DEFAULT '',
  source TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB exercises are publicly readable"
  ON public.kb_exercises FOR SELECT USING (true);

CREATE POLICY "KB exercises can be inserted"
  ON public.kb_exercises FOR INSERT WITH CHECK (true);

CREATE POLICY "KB exercises can be updated"
  ON public.kb_exercises FOR UPDATE USING (true);

CREATE INDEX idx_kb_exercises_grade ON public.kb_exercises (grade);
CREATE INDEX idx_kb_exercises_type ON public.kb_exercises (type);

-- KB Patterns table
CREATE TABLE public.kb_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  steps JSONB DEFAULT '[]',
  concepts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB patterns are publicly readable"
  ON public.kb_patterns FOR SELECT USING (true);

CREATE POLICY "KB patterns can be inserted"
  ON public.kb_patterns FOR INSERT WITH CHECK (true);

CREATE POLICY "KB patterns can be updated"
  ON public.kb_patterns FOR UPDATE USING (true);

CREATE POLICY "KB patterns can be deleted"
  ON public.kb_patterns FOR DELETE USING (true);

-- KB Deconstructions table
CREATE TABLE public.kb_deconstructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT NOT NULL REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
  pattern_id TEXT NOT NULL REFERENCES public.kb_patterns(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '[]',
  needs JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_deconstructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB deconstructions are publicly readable"
  ON public.kb_deconstructions FOR SELECT USING (true);

CREATE POLICY "KB deconstructions can be inserted"
  ON public.kb_deconstructions FOR INSERT WITH CHECK (true);

CREATE POLICY "KB deconstructions can be updated"
  ON public.kb_deconstructions FOR UPDATE USING (true);

CREATE POLICY "KB deconstructions can be deleted"
  ON public.kb_deconstructions FOR DELETE USING (true);

CREATE INDEX idx_kb_decon_exercise ON public.kb_deconstructions (exercise_id);
CREATE INDEX idx_kb_decon_pattern ON public.kb_deconstructions (pattern_id);