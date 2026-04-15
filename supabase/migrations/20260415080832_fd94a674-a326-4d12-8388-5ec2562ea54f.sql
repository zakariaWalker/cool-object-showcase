
-- Textbooks table
CREATE TABLE public.textbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'mathematics',
  year TEXT DEFAULT '',
  cover_url TEXT,
  file_path TEXT,
  total_pages INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_progress NUMERIC DEFAULT 0,
  processing_log JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Textbooks viewable by auth" ON public.textbooks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert textbooks" ON public.textbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update textbooks" ON public.textbooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete textbooks" ON public.textbooks FOR DELETE USING (auth.uid() = user_id);

-- Chapters table
CREATE TABLE public.textbook_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  textbook_id UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  title_ar TEXT,
  page_start INTEGER,
  page_end INTEGER,
  domain TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.textbook_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters viewable by auth" ON public.textbook_chapters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can insert chapters" ON public.textbook_chapters FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update chapters" ON public.textbook_chapters FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete chapters" ON public.textbook_chapters FOR DELETE USING (auth.uid() IS NOT NULL);

-- Lessons table
CREATE TABLE public.textbook_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.textbook_chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  title_ar TEXT,
  objectives TEXT[] DEFAULT '{}',
  content_html TEXT DEFAULT '',
  content_latex TEXT DEFAULT '',
  page_start INTEGER,
  page_end INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.textbook_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons viewable by auth" ON public.textbook_lessons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can insert lessons" ON public.textbook_lessons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update lessons" ON public.textbook_lessons FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete lessons" ON public.textbook_lessons FOR DELETE USING (auth.uid() IS NOT NULL);

-- Activities table
CREATE TABLE public.textbook_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.textbook_lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  activity_type TEXT NOT NULL DEFAULT 'exercise',
  title TEXT DEFAULT '',
  title_ar TEXT,
  content_text TEXT NOT NULL DEFAULT '',
  content_latex TEXT DEFAULT '',
  solution_text TEXT DEFAULT '',
  solution_latex TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  bloom_level INTEGER DEFAULT 3,
  hints TEXT[] DEFAULT '{}',
  is_interactive BOOLEAN DEFAULT false,
  expected_answer TEXT DEFAULT '',
  answer_type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.textbook_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activities viewable by auth" ON public.textbook_activities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can insert activities" ON public.textbook_activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update activities" ON public.textbook_activities FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete activities" ON public.textbook_activities FOR DELETE USING (auth.uid() IS NOT NULL);

-- Skill links table
CREATE TABLE public.textbook_skill_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.textbook_activities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  relevance_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(activity_id, skill_id)
);

ALTER TABLE public.textbook_skill_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skill links viewable" ON public.textbook_skill_links FOR SELECT USING (true);
CREATE POLICY "Auth can insert skill links" ON public.textbook_skill_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete skill links" ON public.textbook_skill_links FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at on textbooks
CREATE TRIGGER update_textbooks_updated_at
  BEFORE UPDATE ON public.textbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
