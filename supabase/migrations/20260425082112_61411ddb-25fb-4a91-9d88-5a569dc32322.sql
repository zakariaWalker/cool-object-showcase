
-- 1. Add country_code + slug + is_public to textbooks
ALTER TABLE public.textbooks
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code),
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_textbooks_country ON public.textbooks(country_code);
CREATE INDEX IF NOT EXISTS idx_textbooks_public_status ON public.textbooks(is_public, status);

-- 2. Add slug to chapters and lessons for friendly URLs
ALTER TABLE public.textbook_chapters ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.textbook_lessons ADD COLUMN IF NOT EXISTS slug TEXT;

-- 3. Replace restrictive SELECT policies with public-read for completed textbooks
DROP POLICY IF EXISTS "Textbooks viewable by auth" ON public.textbooks;
CREATE POLICY "Public can view completed public textbooks"
  ON public.textbooks FOR SELECT
  USING (is_public = true AND status = 'completed');
CREATE POLICY "Owners can view their textbooks"
  ON public.textbooks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Chapters viewable by auth" ON public.textbook_chapters;
CREATE POLICY "Chapters viewable by all"
  ON public.textbook_chapters FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Lessons viewable by auth" ON public.textbook_lessons;
CREATE POLICY "Lessons viewable by all"
  ON public.textbook_lessons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Activities viewable by auth" ON public.textbook_activities;
CREATE POLICY "Activities viewable by all"
  ON public.textbook_activities FOR SELECT
  USING (true);

-- 4. Dedicated table for extracted exercises (separate from pedagogical activities)
CREATE TABLE IF NOT EXISTS public.textbook_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.textbook_chapters(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.textbook_lessons(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  exercise_number TEXT,
  statement TEXT NOT NULL,
  statement_latex TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  solution TEXT,
  solution_latex TEXT,
  difficulty INTEGER DEFAULT 2,
  bloom_level INTEGER DEFAULT 3,
  hints TEXT[] DEFAULT '{}'::text[],
  expected_answer TEXT,
  answer_type TEXT DEFAULT 'text',
  domain TEXT,
  concepts TEXT[] DEFAULT '{}'::text[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_textbook_exercises_textbook ON public.textbook_exercises(textbook_id);
CREATE INDEX IF NOT EXISTS idx_textbook_exercises_chapter ON public.textbook_exercises(chapter_id);
CREATE INDEX IF NOT EXISTS idx_textbook_exercises_lesson ON public.textbook_exercises(lesson_id);

ALTER TABLE public.textbook_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises viewable by all"
  ON public.textbook_exercises FOR SELECT
  USING (true);

CREATE POLICY "Auth can insert exercises"
  ON public.textbook_exercises FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can update exercises"
  ON public.textbook_exercises FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can delete exercises"
  ON public.textbook_exercises FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 5. Auto-generate slug from title on insert
CREATE OR REPLACE FUNCTION public.textbook_generate_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base_slug := lower(regexp_replace(COALESCE(NEW.title, 'textbook'), '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'textbook'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.textbooks WHERE slug = final_slug AND id <> NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS textbook_slug_trigger ON public.textbooks;
CREATE TRIGGER textbook_slug_trigger
  BEFORE INSERT ON public.textbooks
  FOR EACH ROW EXECUTE FUNCTION public.textbook_generate_slug();
