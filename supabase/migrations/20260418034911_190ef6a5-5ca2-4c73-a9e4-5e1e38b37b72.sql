-- ===== Multi-Country KB Support =====

-- 1. Countries reference table
CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,                    -- ISO 3166-1 alpha-2: DZ, OM, MA, TN, FR
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  primary_language TEXT NOT NULL DEFAULT 'ar',  -- ar, fr, en
  curriculum_framework TEXT,                 -- e.g. "الجيل الثاني", "Cambridge", "OFSTED"
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries viewable by all" ON public.countries
  FOR SELECT USING (true);
CREATE POLICY "Auth can insert countries" ON public.countries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update countries" ON public.countries
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 2. Country-specific grade levels
CREATE TABLE public.country_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  grade_code TEXT NOT NULL,                 -- e.g. "4AM", "G7", "TC"
  grade_label_ar TEXT NOT NULL,
  grade_label_en TEXT,
  cycle TEXT,                                -- "primary", "middle", "secondary"
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, grade_code)
);

ALTER TABLE public.country_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Country grades viewable by all" ON public.country_grades
  FOR SELECT USING (true);
CREATE POLICY "Auth can manage country grades" ON public.country_grades
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_country_grades_country ON public.country_grades(country_code);

-- 3. Curriculum mapping: universal skills ↔ country-specific grade slot
CREATE TABLE public.curriculum_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  grade_code TEXT NOT NULL,
  semester INTEGER,                          -- 1, 2, 3 (or NULL)
  chapter_label TEXT,                        -- chapter name as it appears in country's textbook
  order_in_curriculum INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (skill_id, country_code, grade_code)
);

ALTER TABLE public.curriculum_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mappings viewable by all" ON public.curriculum_mappings
  FOR SELECT USING (true);
CREATE POLICY "Auth can insert mappings" ON public.curriculum_mappings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update mappings" ON public.curriculum_mappings
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete mappings" ON public.curriculum_mappings
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_mappings_skill ON public.curriculum_mappings(skill_id);
CREATE INDEX idx_mappings_country_grade ON public.curriculum_mappings(country_code, grade_code);

-- 4. Augment kb_skills with universality flag
ALTER TABLE public.kb_skills 
  ADD COLUMN IF NOT EXISTS is_universal BOOLEAN NOT NULL DEFAULT true;

-- 5. Augment kb_exercises with country origin
ALTER TABLE public.kb_exercises
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'DZ';

CREATE INDEX IF NOT EXISTS idx_kb_exercises_country ON public.kb_exercises(country_code);

-- 6. Seed: Algeria + Oman
INSERT INTO public.countries (code, name_ar, name_en, primary_language, curriculum_framework, flag_emoji)
VALUES
  ('DZ', 'الجزائر', 'Algeria', 'ar', 'الجيل الثاني', '🇩🇿'),
  ('OM', 'سلطنة عُمان', 'Oman', 'ar', 'منهج كامبريدج المعرّب', '🇴🇲')
ON CONFLICT (code) DO NOTHING;

-- Algeria grades
INSERT INTO public.country_grades (country_code, grade_code, grade_label_ar, grade_label_en, cycle, order_index) VALUES
  ('DZ', '1AP', 'السنة الأولى ابتدائي', 'Grade 1 Primary', 'primary', 1),
  ('DZ', '2AP', 'السنة الثانية ابتدائي', 'Grade 2 Primary', 'primary', 2),
  ('DZ', '3AP', 'السنة الثالثة ابتدائي', 'Grade 3 Primary', 'primary', 3),
  ('DZ', '4AP', 'السنة الرابعة ابتدائي', 'Grade 4 Primary', 'primary', 4),
  ('DZ', '5AP', 'السنة الخامسة ابتدائي', 'Grade 5 Primary', 'primary', 5),
  ('DZ', '1AM', 'السنة الأولى متوسط', 'Grade 1 Middle', 'middle', 6),
  ('DZ', '2AM', 'السنة الثانية متوسط', 'Grade 2 Middle', 'middle', 7),
  ('DZ', '3AM', 'السنة الثالثة متوسط', 'Grade 3 Middle', 'middle', 8),
  ('DZ', '4AM', 'السنة الرابعة متوسط (BEM)', 'Grade 4 Middle', 'middle', 9),
  ('DZ', '1AS', 'السنة الأولى ثانوي', 'Grade 1 Secondary', 'secondary', 10),
  ('DZ', '2AS', 'السنة الثانية ثانوي', 'Grade 2 Secondary', 'secondary', 11),
  ('DZ', '3AS', 'السنة الثالثة ثانوي (BAC)', 'Grade 3 Secondary', 'secondary', 12)
ON CONFLICT (country_code, grade_code) DO NOTHING;

-- Oman grades (standard 1-12 system)
INSERT INTO public.country_grades (country_code, grade_code, grade_label_ar, grade_label_en, cycle, order_index) VALUES
  ('OM', 'G1',  'الصف الأول',   'Grade 1',  'primary', 1),
  ('OM', 'G2',  'الصف الثاني',  'Grade 2',  'primary', 2),
  ('OM', 'G3',  'الصف الثالث',  'Grade 3',  'primary', 3),
  ('OM', 'G4',  'الصف الرابع',  'Grade 4',  'primary', 4),
  ('OM', 'G5',  'الصف الخامس',  'Grade 5',  'primary', 5),
  ('OM', 'G6',  'الصف السادس',  'Grade 6',  'primary', 6),
  ('OM', 'G7',  'الصف السابع',  'Grade 7',  'middle', 7),
  ('OM', 'G8',  'الصف الثامن',  'Grade 8',  'middle', 8),
  ('OM', 'G9',  'الصف التاسع',  'Grade 9',  'middle', 9),
  ('OM', 'G10', 'الصف العاشر',  'Grade 10', 'secondary', 10),
  ('OM', 'G11', 'الصف الحادي عشر', 'Grade 11', 'secondary', 11),
  ('OM', 'G12', 'الصف الثاني عشر (دبلوم)', 'Grade 12', 'secondary', 12)
ON CONFLICT (country_code, grade_code) DO NOTHING;