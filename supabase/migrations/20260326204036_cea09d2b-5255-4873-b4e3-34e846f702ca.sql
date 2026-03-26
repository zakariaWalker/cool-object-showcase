
-- Table for manual exam entries (ExamKB)
CREATE TABLE public.exam_kb_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year text NOT NULL DEFAULT '',
  session text NOT NULL DEFAULT 'juin',
  format text NOT NULL DEFAULT 'bem',
  grade text NOT NULL DEFAULT '',
  stream text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_kb_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam_kb_entries" ON public.exam_kb_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert exam_kb_entries" ON public.exam_kb_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update exam_kb_entries" ON public.exam_kb_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete exam_kb_entries" ON public.exam_kb_entries FOR DELETE USING (auth.uid() = user_id);

-- Table for manual exam questions (ExamKB)
CREATE TABLE public.exam_kb_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exam_kb_entries(id) ON DELETE CASCADE,
  section_label text NOT NULL DEFAULT '',
  question_number integer NOT NULL DEFAULT 1,
  sub_question text,
  text text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'unclassified',
  difficulty text NOT NULL DEFAULT 'medium',
  concepts text[] DEFAULT '{}'::text[],
  linked_pattern_ids text[] DEFAULT '{}'::text[],
  linked_exercise_ids text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_kb_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam_kb_questions" ON public.exam_kb_questions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert exam_kb_questions" ON public.exam_kb_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update exam_kb_questions" ON public.exam_kb_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete exam_kb_questions" ON public.exam_kb_questions FOR DELETE USING (auth.uid() = user_id);

-- Table for built exams (ExamBuilder)
CREATE TABLE public.built_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  format text NOT NULL DEFAULT 'regular',
  grade text NOT NULL DEFAULT '',
  duration integer NOT NULL DEFAULT 60,
  total_points numeric NOT NULL DEFAULT 20,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.built_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view built_exams" ON public.built_exams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert built_exams" ON public.built_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update built_exams" ON public.built_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete built_exams" ON public.built_exams FOR DELETE USING (auth.uid() = user_id);

-- Table for exam corrections
CREATE TABLE public.exam_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.built_exams(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  total_possible numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  corrected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam_corrections" ON public.exam_corrections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert exam_corrections" ON public.exam_corrections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update exam_corrections" ON public.exam_corrections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete exam_corrections" ON public.exam_corrections FOR DELETE USING (auth.uid() = user_id);
