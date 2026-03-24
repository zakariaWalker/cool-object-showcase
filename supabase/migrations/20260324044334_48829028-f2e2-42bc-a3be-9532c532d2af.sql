
-- ==========================================
-- 1. ENUM for user roles
-- ==========================================
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin', 'parent');

-- ==========================================
-- 2. Profiles table
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. User roles table
-- ==========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==========================================
-- 4. Curricula table
-- ==========================================
CREATE TABLE public.curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'رياضيات',
  grade_level TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published curricula visible to all" ON public.curricula FOR SELECT TO authenticated USING (is_published = true OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can create curricula" ON public.curricula FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Teachers can update own curricula" ON public.curricula FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own curricula" ON public.curricula FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- ==========================================
-- 5. Lessons table
-- ==========================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  lesson_type TEXT NOT NULL DEFAULT 'video',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lessons visible to authenticated" ON public.lessons FOR SELECT TO authenticated USING (
  is_published = true OR EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Teachers can manage own lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update own lessons" ON public.lessons FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can delete own lessons" ON public.lessons FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);

-- ==========================================
-- 6. Quizzes table
-- ==========================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published quizzes visible" ON public.quizzes FOR SELECT TO authenticated USING (
  is_published = true OR EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Teachers can manage quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.curricula WHERE id = curriculum_id AND teacher_id = auth.uid())
);

-- ==========================================
-- 7. Quiz questions table
-- ==========================================
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 1
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz questions visible with quiz" ON public.quiz_questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.curricula c ON q.curriculum_id = c.id WHERE q.id = quiz_id AND (q.is_published = true OR c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Teachers can manage questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.curricula c ON q.curriculum_id = c.id WHERE q.id = quiz_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.curricula c ON q.curriculum_id = c.id WHERE q.id = quiz_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.curricula c ON q.curriculum_id = c.id WHERE q.id = quiz_id AND c.teacher_id = auth.uid())
);

-- ==========================================
-- 8. Student progress table
-- ==========================================
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  score NUMERIC,
  time_spent_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT progress_has_target CHECK (lesson_id IS NOT NULL OR quiz_id IS NOT NULL)
);
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own progress" ON public.student_progress FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'parent')
);
CREATE POLICY "Students can insert own progress" ON public.student_progress FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own progress" ON public.student_progress FOR UPDATE TO authenticated USING (student_id = auth.uid());

-- ==========================================
-- 9. Parent-student relationship
-- ==========================================
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own links" ON public.parent_students FOR SELECT TO authenticated USING (parent_id = auth.uid() OR student_id = auth.uid());
CREATE POLICY "Parents can create links" ON public.parent_students FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND public.has_role(auth.uid(), 'parent'));

-- ==========================================
-- 10. Updated_at trigger function
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_curricula_updated_at BEFORE UPDATE ON public.curricula FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 11. Auto-create profile on signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 12. Storage bucket for educational materials
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('educational-materials', 'educational-materials', true);

CREATE POLICY "Anyone can view educational materials" ON storage.objects FOR SELECT USING (bucket_id = 'educational-materials');
CREATE POLICY "Teachers can upload materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'educational-materials' AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update own materials" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'educational-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Teachers can delete own materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'educational-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
