-- Rule-based question generator: templates + materialized variants

CREATE TABLE public.question_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  skill_id UUID REFERENCES public.kb_skills(id) ON DELETE SET NULL,
  grade_code TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT 'DZ',
  domain TEXT NOT NULL DEFAULT 'algebra',
  subdomain TEXT DEFAULT '',
  -- 'qcm' (multiple choice) or 'numeric' (typed numeric answer)
  kind TEXT NOT NULL DEFAULT 'numeric',
  -- difficulty 1..5, bloom 1..6
  difficulty INTEGER NOT NULL DEFAULT 1,
  bloom_level INTEGER NOT NULL DEFAULT 3,
  -- the question text with placeholders like "احسب {{a}} + {{b}}" or "Solve {{a}}x + {{b}} = {{c}}"
  template_text TEXT NOT NULL,
  -- variables: [{ name: "a", type: "int", min: 1, max: 9 }, { name: "b", type: "int", min: 1, max: 9 }]
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- answer: arithmetic expression using variables, e.g. "(c - b) / a"
  answer_expression TEXT NOT NULL DEFAULT '',
  -- for qcm: array of distractor expressions, e.g. ["a + b", "a - b", "a * b"]
  distractor_expressions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- optional constraints (JS-like boolean expressions in our safe DSL), e.g. ["a != 0", "(c - b) % a == 0"]
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- presentation
  answer_unit TEXT DEFAULT '',
  hint TEXT DEFAULT '',
  solution_template TEXT DEFAULT '',
  -- status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qt_grade ON public.question_templates(grade_code);
CREATE INDEX idx_qt_skill ON public.question_templates(skill_id);
CREATE INDEX idx_qt_active ON public.question_templates(is_active);

ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by all"
  ON public.question_templates FOR SELECT USING (true);
CREATE POLICY "Admins can insert templates"
  ON public.question_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update templates"
  ON public.question_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete templates"
  ON public.question_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_qt_updated
  BEFORE UPDATE ON public.question_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Materialized variants generated from a template
CREATE TABLE public.question_template_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.question_templates(id) ON DELETE CASCADE,
  -- stable fingerprint of resolved question text
  variant_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'numeric',
  answer TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  grade_code TEXT NOT NULL DEFAULT '',
  skill_id UUID,
  difficulty INTEGER NOT NULL DEFAULT 1,
  bloom_level INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, variant_hash)
);

CREATE INDEX idx_qtv_template ON public.question_template_variants(template_id);
CREATE INDEX idx_qtv_grade ON public.question_template_variants(grade_code);
CREATE INDEX idx_qtv_skill ON public.question_template_variants(skill_id);
CREATE INDEX idx_qtv_active ON public.question_template_variants(is_active);

ALTER TABLE public.question_template_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants readable by all"
  ON public.question_template_variants FOR SELECT USING (true);
CREATE POLICY "Admins can insert variants"
  ON public.question_template_variants FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update variants"
  ON public.question_template_variants FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete variants"
  ON public.question_template_variants FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));