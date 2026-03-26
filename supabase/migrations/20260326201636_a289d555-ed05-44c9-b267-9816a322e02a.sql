-- =============================================
-- Profiles table
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- User roles
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'parent', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- KB Exercises
-- =============================================
CREATE TABLE public.kb_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE POLICY "KB exercises viewable by all" ON public.kb_exercises FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert kb_exercises" ON public.kb_exercises FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update kb_exercises" ON public.kb_exercises FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete kb_exercises" ON public.kb_exercises FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- KB Patterns
-- =============================================
CREATE TABLE public.kb_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  steps JSONB DEFAULT '[]',
  concepts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB patterns viewable by all" ON public.kb_patterns FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert kb_patterns" ON public.kb_patterns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update kb_patterns" ON public.kb_patterns FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete kb_patterns" ON public.kb_patterns FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- KB Deconstructions
-- =============================================
CREATE TABLE public.kb_deconstructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES public.kb_patterns(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '[]',
  needs JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_deconstructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB deconstructions viewable by all" ON public.kb_deconstructions FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert kb_deconstructions" ON public.kb_deconstructions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update kb_deconstructions" ON public.kb_deconstructions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete kb_deconstructions" ON public.kb_deconstructions FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- Student Progress
-- =============================================
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active_date TEXT,
  total_exercises INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]',
  mastery JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student progress viewable by all authenticated" ON public.student_progress FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can insert student_progress" ON public.student_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update student_progress" ON public.student_progress FOR UPDATE USING (true);

CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Student Activity Log
-- =============================================
CREATE TABLE public.student_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  action TEXT NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity log viewable by authenticated" ON public.student_activity_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can insert activity_log" ON public.student_activity_log FOR INSERT WITH CHECK (true);

-- =============================================
-- Curricula
-- =============================================
CREATE TABLE public.curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curricula viewable by all" ON public.curricula FOR SELECT USING (true);
CREATE POLICY "Teachers can manage own curricula" ON public.curricula FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own curricula" ON public.curricula FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own curricula" ON public.curricula FOR DELETE USING (auth.uid() = teacher_id);

-- =============================================
-- Lessons
-- =============================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  lesson_type TEXT DEFAULT 'text',
  video_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons viewable by all" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert lessons" ON public.lessons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update lessons" ON public.lessons FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete lessons" ON public.lessons FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- Classes
-- =============================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classes viewable by all authenticated" ON public.classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Teachers can manage classes" ON public.classes FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update classes" ON public.classes FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete classes" ON public.classes FOR DELETE USING (auth.uid() = teacher_id);

-- =============================================
-- Class Enrollments
-- =============================================
CREATE TABLE public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrollments viewable by authenticated" ON public.class_enrollments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can enroll" ON public.class_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);

-- =============================================
-- Parent-Student Links
-- =============================================
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view own links" ON public.parent_students FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert links" ON public.parent_students FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- =============================================
-- Student Join Codes (for parent linking)
-- =============================================
CREATE TABLE public.student_join_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

ALTER TABLE public.student_join_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Join codes viewable by owner" ON public.student_join_codes FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can upsert codes" ON public.student_join_codes FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update codes" ON public.student_join_codes FOR UPDATE USING (auth.uid() = student_id);

-- =============================================
-- Student Knowledge Gaps
-- =============================================
CREATE TABLE public.student_knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_knowledge_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gaps viewable by authenticated" ON public.student_knowledge_gaps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can insert gaps" ON public.student_knowledge_gaps FOR INSERT WITH CHECK (true);

-- =============================================
-- Student SM2 (spaced repetition)
-- =============================================
CREATE TABLE public.student_sm2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  exercise_id UUID REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
  ease_factor NUMERIC DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, exercise_id)
);

ALTER TABLE public.student_sm2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SM2 viewable by authenticated" ON public.student_sm2 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can upsert sm2" ON public.student_sm2 FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sm2" ON public.student_sm2 FOR UPDATE USING (true);

-- =============================================
-- Attempts
-- =============================================
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  exercise_id UUID REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  score NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attempts viewable by authenticated" ON public.attempts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can insert attempts" ON public.attempts FOR INSERT WITH CHECK (true);

-- =============================================
-- Storage bucket for educational materials
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('educational-materials', 'educational-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Educational materials publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'educational-materials');
CREATE POLICY "Authenticated can upload educational materials" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'educational-materials' AND auth.uid() IS NOT NULL);