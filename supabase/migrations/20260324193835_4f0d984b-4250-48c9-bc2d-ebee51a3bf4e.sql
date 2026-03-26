-- Exercise breakdown table storing enriched/deconstructed exercises
CREATE TABLE public.exercise_breakdowns (
  id UUID PRIMARY KEY,
  source_text TEXT NOT NULL,
  source_language TEXT DEFAULT 'ar',
  source_origin TEXT DEFAULT 'dataset',
  domain TEXT DEFAULT '',
  subdomain TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  grade TEXT DEFAULT 'BEM',
  intent JSONB DEFAULT '{}',
  semantic_objects JSONB DEFAULT '{}',
  relations JSONB DEFAULT '[]',
  constraints JSONB DEFAULT '[]',
  formulas_needed JSONB DEFAULT '[]',
  diagram_spec JSONB,
  render_plan JSONB DEFAULT '{}',
  solution_tree JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_breakdowns ENABLE ROW LEVEL SECURITY;

-- Public read access (exercises are educational content)
CREATE POLICY "Exercises are publicly readable"
  ON public.exercise_breakdowns FOR SELECT
  USING (true);

-- Index for filtering
CREATE INDEX idx_exercise_breakdowns_grade ON public.exercise_breakdowns (grade);
CREATE INDEX idx_exercise_breakdowns_domain ON public.exercise_breakdowns (domain);
CREATE INDEX idx_exercise_breakdowns_grade_domain ON public.exercise_breakdowns (grade, domain);