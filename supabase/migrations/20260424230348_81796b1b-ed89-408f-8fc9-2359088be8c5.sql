-- 1. Add tracking columns to student_knowledge_gaps
ALTER TABLE public.student_knowledge_gaps
  ADD COLUMN IF NOT EXISTS misconception_type text,
  ADD COLUMN IF NOT EXISTS skill_id uuid REFERENCES public.kb_skills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_occurred_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

-- Allow UPDATE on the gaps table (currently no update policy)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'student_knowledge_gaps' AND policyname = 'Anyone can update gaps'
  ) THEN
    CREATE POLICY "Anyone can update gaps" 
      ON public.student_knowledge_gaps FOR UPDATE USING (true);
  END IF;
END $$;

-- Unique index to enable upsert by (student, misconception_type, topic)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gap_student_type_topic
  ON public.student_knowledge_gaps (student_id, misconception_type, topic)
  WHERE misconception_type IS NOT NULL;

-- 2. Mapping table: misconception_type -> skill
CREATE TABLE IF NOT EXISTS public.misconception_skill_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  misconception_type text NOT NULL,
  skill_name text NOT NULL,
  skill_id uuid REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  domain text NOT NULL DEFAULT 'algebra',
  topic_ar text NOT NULL,
  threshold integer NOT NULL DEFAULT 3,
  severity text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(misconception_type, domain)
);

ALTER TABLE public.misconception_skill_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map readable by all" 
  ON public.misconception_skill_map FOR SELECT USING (true);

CREATE POLICY "Auth can manage map" 
  ON public.misconception_skill_map FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed the map with the misconception types defined in the engine
INSERT INTO public.misconception_skill_map (misconception_type, skill_name, domain, topic_ar, threshold, severity) VALUES
  ('sign_error', 'Operations on signed numbers', 'algebra', 'العمليات على الأعداد النسبية والإشارات', 3, 'medium'),
  ('distribution_error', 'Distributivity and factoring', 'algebra', 'النشر والتعميل', 2, 'high'),
  ('exponent_error', 'Remarkable identities', 'algebra', 'المتطابقات الشهيرة (a+b)²', 2, 'high'),
  ('bracket_error', 'Bracket balancing', 'algebra', 'التعامل مع الأقواس', 3, 'medium'),
  ('arithmetic_error', 'Numerical computation', 'algebra', 'الحساب العددي', 4, 'low'),
  ('missing_term', 'Term tracking in expansion', 'algebra', 'تتبّع الحدود عند النشر', 2, 'high')
ON CONFLICT (misconception_type, domain) DO NOTHING;