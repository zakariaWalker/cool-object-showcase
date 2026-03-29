-- Create exercise_reports table
CREATE TABLE IF NOT EXISTS public.exercise_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.kb_exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.exercise_reports IS 'Reports from students about exercise issues (text, math, etc.)';

-- Enable RLS
ALTER TABLE public.exercise_reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Students can insert their own reports
CREATE POLICY "Students can insert reports" 
ON public.exercise_reports 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = student_id);

-- 2. Students can view their own reports
CREATE POLICY "Students can view own reports"
ON public.exercise_reports
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- 3. Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.exercise_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- 4. Admins can update report status
CREATE POLICY "Admins can update reports"
ON public.exercise_reports
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.exercise_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
