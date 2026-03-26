
-- Student progress tracking for gamification
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_active_date date DEFAULT CURRENT_DATE,
  total_exercises integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_challenge_completed boolean NOT NULL DEFAULT false,
  daily_challenge_date date DEFAULT CURRENT_DATE,
  mastery jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student progress is publicly readable" ON public.student_progress FOR SELECT TO public USING (true);
CREATE POLICY "Student progress can be inserted" ON public.student_progress FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Student progress can be updated" ON public.student_progress FOR UPDATE TO public USING (true);

-- Activity log for XP history and engagement tracking
CREATE TABLE public.student_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  action text NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity log is publicly readable" ON public.student_activity_log FOR SELECT TO public USING (true);
CREATE POLICY "Activity log can be inserted" ON public.student_activity_log FOR INSERT TO public WITH CHECK (true);
