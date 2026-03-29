
-- Enable RLS for exercise_reports
ALTER TABLE IF EXISTS public.exercise_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to be safe)
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.exercise_reports;
DROP POLICY IF EXISTS "Allow users to view own reports" ON public.exercise_reports;
DROP POLICY IF EXISTS "Allow all authenticated to select" ON public.exercise_reports;
DROP POLICY IF EXISTS "Allow all authenticated to update" ON public.exercise_reports;

-- Allow authenticated users to insert reports
CREATE POLICY "Allow authenticated insert" ON public.exercise_reports 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to view reports (Admin dashboard uses this)
CREATE POLICY "Allow authenticated select" ON public.exercise_reports 
  FOR SELECT TO authenticated 
  USING (true);

-- Allow authenticated users to update reports (Admin dashboard uses this to resolve)
CREATE POLICY "Allow authenticated update" ON public.exercise_reports 
  FOR UPDATE TO authenticated 
  USING (true);
