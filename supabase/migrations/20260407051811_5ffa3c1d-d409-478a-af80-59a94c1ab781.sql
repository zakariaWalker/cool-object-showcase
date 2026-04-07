
-- Skills table
CREATE TABLE public.kb_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT DEFAULT '',
  domain TEXT DEFAULT 'algebra',
  subdomain TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  bloom_level INTEGER DEFAULT 3,
  frequency INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills viewable by all" ON public.kb_skills FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert skills" ON public.kb_skills FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update skills" ON public.kb_skills FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete skills" ON public.kb_skills FOR DELETE USING (auth.uid() IS NOT NULL);

-- Skill dependencies (graph edges)
CREATE TABLE public.kb_skill_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  to_skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'prerequisite',
  strength NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_skill_id, to_skill_id)
);
ALTER TABLE public.kb_skill_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deps viewable by all" ON public.kb_skill_dependencies FOR SELECT USING (true);
CREATE POLICY "Auth can insert deps" ON public.kb_skill_dependencies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update deps" ON public.kb_skill_dependencies FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete deps" ON public.kb_skill_dependencies FOR DELETE USING (auth.uid() IS NOT NULL);

-- Skill errors (common mistakes)
CREATE TABLE public.kb_skill_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  error_description TEXT NOT NULL,
  error_type TEXT DEFAULT 'conceptual',
  frequency INTEGER DEFAULT 0,
  fix_hint TEXT DEFAULT '',
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_skill_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Errors viewable by all" ON public.kb_skill_errors FOR SELECT USING (true);
CREATE POLICY "Auth can insert errors" ON public.kb_skill_errors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update errors" ON public.kb_skill_errors FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete errors" ON public.kb_skill_errors FOR DELETE USING (auth.uid() IS NOT NULL);

-- Skill ↔ Pattern links
CREATE TABLE public.kb_skill_pattern_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES public.kb_patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, pattern_id)
);
ALTER TABLE public.kb_skill_pattern_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SP links viewable" ON public.kb_skill_pattern_links FOR SELECT USING (true);
CREATE POLICY "Auth can insert SP" ON public.kb_skill_pattern_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete SP" ON public.kb_skill_pattern_links FOR DELETE USING (auth.uid() IS NOT NULL);

-- Skill ↔ Exercise links
CREATE TABLE public.kb_skill_exercise_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, exercise_id)
);
ALTER TABLE public.kb_skill_exercise_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SE links viewable" ON public.kb_skill_exercise_links FOR SELECT USING (true);
CREATE POLICY "Auth can insert SE" ON public.kb_skill_exercise_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete SE" ON public.kb_skill_exercise_links FOR DELETE USING (auth.uid() IS NOT NULL);

-- Courses (uploaded textbooks/curriculum)
CREATE TABLE public.kb_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'pdf',
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  extracted_skills JSONB DEFAULT '[]',
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses viewable by auth" ON public.kb_courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert courses" ON public.kb_courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update courses" ON public.kb_courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete courses" ON public.kb_courses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_kb_courses_updated_at BEFORE UPDATE ON public.kb_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Course ↔ Skill ordering
CREATE TABLE public.kb_course_skill_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.kb_courses(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, skill_id)
);
ALTER TABLE public.kb_course_skill_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CS links viewable" ON public.kb_course_skill_links FOR SELECT USING (true);
CREATE POLICY "Auth can insert CS" ON public.kb_course_skill_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete CS" ON public.kb_course_skill_links FOR DELETE USING (auth.uid() IS NOT NULL);
